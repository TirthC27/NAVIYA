from flask import jsonify, request, current_app


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
        """Get session data"""
        session = current_app.orchestrator.get_session(session_id)
        if session is None:
            return jsonify({"error": "Session not found"}), 404
        return jsonify(session)
