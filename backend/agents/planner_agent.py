from typing import Dict, Any
from agents.base_agent import BaseAgent
import opik


class PlannerAgent(BaseAgent):
    """Agent that creates learning roadmaps (static output for now)"""
    
    def __init__(self):
        super().__init__("planner")
    
    @opik.track(name="planner_agent_execution", type="general")
    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a learning roadmap
        
        Args:
            input_data: Should contain 'topic' key
            
        Returns:
            Static roadmap structure
        """
        topic = input_data.get('topic', 'Unknown Topic')
        
        # Static roadmap - will be replaced with AI logic later
        roadmap = {
            'topic': topic,
            'phases': [
                {
                    'phase': 1,
                    'title': 'Foundations',
                    'duration': '2 weeks',
                    'milestones': [
                        {
                            'id': 1,
                            'title': 'Basic Concepts',
                            'description': f'Learn fundamental concepts of {topic}',
                            'resources': [
                                {'type': 'video', 'title': 'Introduction to ' + topic},
                                {'type': 'article', 'title': 'Getting Started Guide'}
                            ]
                        },
                        {
                            'id': 2,
                            'title': 'Core Principles',
                            'description': 'Understand the core principles',
                            'resources': [
                                {'type': 'book', 'title': 'Essential Reading'},
                                {'type': 'tutorial', 'title': 'Hands-on Practice'}
                            ]
                        }
                    ]
                },
                {
                    'phase': 2,
                    'title': 'Intermediate Skills',
                    'duration': '3 weeks',
                    'milestones': [
                        {
                            'id': 3,
                            'title': 'Applied Practice',
                            'description': 'Apply knowledge through projects',
                            'resources': [
                                {'type': 'project', 'title': 'Build a Simple Project'},
                                {'type': 'exercise', 'title': 'Practice Problems'}
                            ]
                        }
                    ]
                },
                {
                    'phase': 3,
                    'title': 'Advanced Topics',
                    'duration': '4 weeks',
                    'milestones': [
                        {
                            'id': 4,
                            'title': 'Deep Dive',
                            'description': 'Explore advanced concepts',
                            'resources': [
                                {'type': 'course', 'title': 'Advanced Techniques'},
                                {'type': 'documentation', 'title': 'Technical Reference'}
                            ]
                        }
                    ]
                }
            ],
            'estimated_total_time': '9 weeks',
            'difficulty': 'beginner-to-intermediate'
        }
        
        return roadmap
