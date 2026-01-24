from flask import Flask
from app.config import get_config
import logging


def create_app():
    app = Flask(__name__)
    
    # Load configuration
    config = get_config()
    app.config.from_object(config)
    
    # Setup logging
    setup_logging(app)
    
    # Import and register routes
    from app.routes import register_routes
    register_routes(app)
    
    app.logger.info(f"App started in {app.config['FLASK_ENV']} mode")
    
    return app


def setup_logging(app):
    """Configure logging"""
    if app.config['DEBUG']:
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    else:
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
