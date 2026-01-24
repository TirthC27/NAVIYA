from flask import jsonify


def register_routes(app):
    @app.route('/health', methods=['GET'])
    def health():
        app.logger.debug('Health check requested')
        return jsonify({"status": "ok"})
