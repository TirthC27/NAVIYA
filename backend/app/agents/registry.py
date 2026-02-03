"""
Agent Registry

Central registry for all agent workers.
Maps agent_name -> agent_worker instance.
"""

from typing import Dict, Optional, List
from app.agents.worker_base import (
    AgentWorker,
)
from app.agents.mentor_agent import MentorAgentWorker
from app.agents.resume_intelligence_agent import ResumeIntelligenceAgentWorker
from app.agents.roadmap_agent import RoadmapAgentWorker


# ============================================
# Agent Registry
# ============================================

class AgentRegistry:
    """
    Central registry for all agent workers.
    
    Responsibilities:
    - Register all available agents
    - Map agent_name -> agent_worker instance
    - Provide lookup methods
    
    The registry:
    - Fails safely if agent not found
    - Is extensible without modifying core logic
    """
    
    def __init__(self):
        self._agents: Dict[str, AgentWorker] = {}
        self._initialize_default_agents()
    
    def _initialize_default_agents(self):
        """Register all default agent workers"""
        default_agents = [
            ResumeIntelligenceAgentWorker(),
            RoadmapAgentWorker(),
            MentorAgentWorker(),
        ]
        
        for agent in default_agents:
            self.register(agent)
    
    def register(self, agent: AgentWorker) -> None:
        """
        Register an agent worker.
        
        Args:
            agent: AgentWorker instance to register
        """
        if agent.agent_name in self._agents:
            print(f"⚠️ Warning: Overwriting existing agent: {agent.agent_name}")
        
        self._agents[agent.agent_name] = agent
        print(f"📝 Registered agent: {agent.agent_name} ({len(agent.supported_task_types)} task types)")
    
    def unregister(self, agent_name: str) -> bool:
        """
        Unregister an agent worker.
        
        Args:
            agent_name: Name of the agent to unregister
            
        Returns:
            True if agent was found and removed
        """
        if agent_name in self._agents:
            del self._agents[agent_name]
            print(f"🗑️ Unregistered agent: {agent_name}")
            return True
        return False
    
    def get_agent(self, agent_name: str) -> Optional[AgentWorker]:
        """
        Get an agent worker by name.
        
        Args:
            agent_name: Name of the agent
            
        Returns:
            AgentWorker instance or None if not found
        """
        return self._agents.get(agent_name)
    
    def get_agent_for_task(self, agent_name: str, task_type: str) -> Optional[AgentWorker]:
        """
        Get an agent that can handle a specific task.
        
        Args:
            agent_name: Name of the agent
            task_type: Type of task to handle
            
        Returns:
            AgentWorker if found and can handle task, None otherwise
        """
        agent = self.get_agent(agent_name)
        if agent and agent.can_handle(task_type):
            return agent
        return None
    
    def list_agents(self) -> List[str]:
        """Get list of all registered agent names"""
        return list(self._agents.keys())
    
    def list_agent_details(self) -> List[Dict]:
        """Get detailed info about all registered agents"""
        return [
            {
                "agent_name": agent.agent_name,
                "supported_task_types": agent.supported_task_types,
                "output_tables": agent.output_tables
            }
            for agent in self._agents.values()
        ]
    
    def is_registered(self, agent_name: str) -> bool:
        """Check if an agent is registered"""
        return agent_name in self._agents
    
    def can_handle_task(self, agent_name: str, task_type: str) -> bool:
        """Check if an agent can handle a specific task type"""
        agent = self.get_agent(agent_name)
        return agent is not None and agent.can_handle(task_type)


# ============================================
# Global Registry Instance
# ============================================

# Singleton instance - initialized on import
_registry: Optional[AgentRegistry] = None


def get_registry() -> AgentRegistry:
    """
    Get the global agent registry instance.
    Creates a new instance if not already initialized.
    """
    global _registry
    if _registry is None:
        _registry = AgentRegistry()
    return _registry


def register_agent(agent: AgentWorker) -> None:
    """Convenience function to register an agent to the global registry"""
    get_registry().register(agent)


def get_agent(agent_name: str) -> Optional[AgentWorker]:
    """Convenience function to get an agent from the global registry"""
    return get_registry().get_agent(agent_name)
