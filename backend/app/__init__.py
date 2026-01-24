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
    
    # Initialize orchestrator
    from agents.orchestrator import Orchestrator
    from agents.planner_agent import PlannerAgent
    
    orchestrator = Orchestrator()
    orchestrator.register_agent(PlannerAgent())
    
    # Store orchestrator in app context
    app.orchestrator = orchestrator
    
    # Import and register routes
    from app.routes import register_routes
    register_routes(app)
    
    app.logger.info(f"App started in {app.config['FLASK_ENV']} mode")
    app.logger.info(f"Registered agents: {orchestrator.list_agents()}")
    
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
