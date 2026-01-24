from flask import jsonify, request, current_app
from app.supabase_client import get_supabase_client
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
        """Create a new learning session"""
        try:
            data = request.get_json()
            if not data or 'topic' not in data:
                return jsonify({"error": "Topic is required"}), 400
            
            supabase = get_supabase_client()
            
            session_data = {
                'id': str(uuid.uuid4()),
                'topic': data['topic'],
                'current_mission': data.get('current_mission', 'Planning'),
                'eta_days': data.get('eta_days', 30),
                'start_time': datetime.utcnow().isoformat()
            }
            
            response = supabase.table('learning_sessions').insert(session_data).execute()
            
            if not response.data:
                return jsonify({"error": "Failed to create session"}), 500
            
            return jsonify(response.data[0]), 201
            
        except Exception as e:
            app.logger.error(f"Error creating session: {str(e)}")
            return jsonify({"error": "Failed to create session"}), 500
