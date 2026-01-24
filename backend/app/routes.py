from flask import jsonify, request, current_app
from app.supabase_client import get_supabase_client
from data_ingestion.youtube_loader import load_youtube_transcript, TranscriptError
from data_ingestion.transcript_storage import save_transcript, get_transcript, TranscriptStorageError
from datetime import datetime
import uuid


def register_routes(app):
    @app.route('/health', methods=['GET'])
    def health():
        app.logger.debug('Health check requested')
        return jsonify({"status": "ok"})
    
    @app.route('/agents', methods=['GET'])
    def list_agents():
        """List all available agents"""
        agents = current_app.orchestrator.list_agents()
        return jsonify({"agents": agents})
    
    @app.route('/agents/<agent_name>/execute', methods=['POST'])
    def execute_agent(agent_name):
        """Execute a specific agent"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No input data provided"}), 400
            
            input_data = data.get('input', {})
            session_id = data.get('session_id')
            
            # Validate session exists if provided
            if session_id:
                supabase = get_supabase_client()
                session_check = supabase.table('learning_sessions').select('id').eq('id', session_id).execute()
                if not session_check.data:
                    return jsonify({"error": "Session not found"}), 404
            
            result = current_app.orchestrator.execute(
                agent_name=agent_name,
                input_data=input_data,
                session_id=session_id
            )
            
            return jsonify(result), 200
            
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
        except Exception as e:
            app.logger.error(f"Error executing agent: {str(e)}")
            return jsonify({"error": "Internal server error"}), 500
    
    @app.route('/sessions/<session_id>', methods=['GET'])
    def get_session(session_id):
        """Get session data from Supabase"""
        try:
            supabase = get_supabase_client()
            response = supabase.table('learning_sessions').select('*').eq('id', session_id).execute()
            
            if not response.data:
                return jsonify({"error": "Session not found"}), 404
            
            return jsonify(response.data[0]), 200
            
        except Exception as e:
            app.logger.error(f"Error fetching session: {str(e)}")
            return jsonify({"error": "Failed to fetch session"}), 500
    
    @app.route('/session/start', methods=['POST'])
    def start_session():
        """Create a new learning session with ETA prediction"""
        try:
            data = request.get_json()
            if not data or 'topic' not in data:
                return jsonify({"error": "Topic is required"}), 400
            
            supabase = get_supabase_client()
            session_id = str(uuid.uuid4())
            
            # Generate roadmap using planner agent
            roadmap = None
            eta_days = 30  # Default
            
            if data.get('auto_plan', True):
                try:
                    planner_result = current_app.orchestrator.execute(
                        agent_name='planner',
                        input_data={'topic': data['topic']},
                        session_id=session_id
                    )
                    roadmap = planner_result.get('result')
                    
                    # Predict timeline using timeline predictor
                    if roadmap:
                        timeline_result = current_app.orchestrator.execute(
                            agent_name='timeline_predictor',
                            input_data={'roadmap': roadmap},
                            session_id=session_id
                        )
                        eta_days = timeline_result.get('result', {}).get('eta_days', 30)
                except Exception as e:
                    app.logger.warning(f"Auto-planning failed: {str(e)}, using defaults")
            
            session_data = {
                'id': session_id,
                'topic': data['topic'],
                'current_mission': data.get('current_mission', 'Planning'),
                'eta_days': data.get('eta_days', eta_days),
                'start_time': datetime.utcnow().isoformat()
            }
            
            response = supabase.table('learning_sessions').insert(session_data).execute()
            
            if not response.data:
                return jsonify({"error": "Failed to create session"}), 500
            
            result = response.data[0]
            if roadmap:
                result['initial_roadmap'] = roadmap
            
            return jsonify(result), 201
            
        except Exception as e:
            app.logger.error(f"Error creating session: {str(e)}")
            return jsonify({"error": "Failed to create session"}), 500
    
    @app.route('/transcripts/load', methods=['POST'])
    def load_transcript():
        """Load a YouTube transcript and save to Supabase"""
        try:
            data = request.get_json()
            if not data or 'video_id' not in data:
                return jsonify({"error": "video_id is required"}), 400
            
            video_id = data['video_id']
            
            # Check if transcript already exists
            existing = get_transcript(video_id)
            if existing:
                return jsonify({
                    "message": "Transcript already exists",
                    "transcript": existing
                }), 200
            
            # Fetch and clean transcript
            try:
                cleaned_text = load_youtube_transcript(video_id)
            except TranscriptError as e:
                app.logger.warning(f"Transcript fetch failed: {str(e)}")
                return jsonify({"error": str(e)}), 404
            
            # Save to Supabase
            try:
                transcript_data = save_transcript(video_id, cleaned_text)
                return jsonify({
                    "message": "Transcript loaded successfully",
                    "transcript": transcript_data
                }), 201
            except TranscriptStorageError as e:
                app.logger.error(f"Storage error: {str(e)}")
                return jsonify({"error": str(e)}), 400
            
        except Exception as e:
            app.logger.error(f"Unexpected error loading transcript: {str(e)}")
            return jsonify({"error": "Failed to load transcript"}), 500
    
    @app.route('/transcripts/<video_id>', methods=['GET'])
    def fetch_transcript(video_id):
        """Retrieve a transcript by video_id"""
        try:
            transcript = get_transcript(video_id)
            
            if not transcript:
                return jsonify({"error": "Transcript not found"}), 404
            
            return jsonify(transcript), 200
            
        except TranscriptStorageError as e:
            app.logger.error(f"Error fetching transcript: {str(e)}")
            return jsonify({"error": str(e)}), 500
        except Exception as e:
            app.logger.error(f"Unexpected error: {str(e)}")
            return jsonify({"error": "Failed to fetch transcript"}), 500

