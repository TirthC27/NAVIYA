from typing import Dict, Any, Optional
from agents.base_agent import BaseAgent
from app.tracing import trace_agent_execution
import uuid
import time


class Orchestrator:
    """Manages and coordinates multiple agents"""
    
    def __init__(self):
        self.agents: Dict[str, BaseAgent] = {}
        self.sessions: Dict[str, Dict[str, Any]] = {}
    
    def register_agent(self, agent: BaseAgent) -> None:
        """
        Register an agent with the orchestrator
        
        Args:
            agent: BaseAgent instance to register
        """
        self.agents[agent.name] = agent
    
    @trace_agent_execution
    def execute(self, agent_name: str, input_data: Dict[str, Any], session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute a specific agent by name
        
        Args:
            agent_name: Name of the agent to execute
            input_data: Input data to pass to the agent
            session_id: Optional session ID for tracking
            
        Returns:
            Dictionary containing agent output and metadata
        """
        if agent_name not in self.agents:
            raise ValueError(f"Agent '{agent_name}' not found")
        
        # Generate or use existing session ID
        if session_id is None:
            session_id = str(uuid.uuid4())
        
        # Store session data
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                'history': []
            }
        
        # Start timing for execution
        start_time = time.time()
        
        # Execute the agent
        agent = self.agents[agent_name]
        result = agent.run(input_data)
        
        # Calculate execution time
        execution_time_ms = (time.time() - start_time) * 1000
        
        # Track execution in session
        self.sessions[session_id]['history'].append({
            'agent': agent_name,
            'input': input_data,
            'output': result,
            'execution_time_ms': execution_time_ms
        })
        
        return {
            'session_id': session_id,
            'agent': agent_name,
            'result': result,
            'execution_time_ms': execution_time_ms
        }
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data by ID"""
        return self.sessions.get(session_id)
    
    def list_agents(self) -> list:
        """List all registered agent names"""
        return list(self.agents.keys())
