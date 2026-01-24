from typing import Dict, Any
from agents.base_agent import BaseAgent
import opik


class TimelinePredictor(BaseAgent):
    """Agent that predicts learning timeline (static formula for now)"""
    
    def __init__(self):
        super().__init__("timeline_predictor")
    
    @opik.track(name="timeline_predictor_execution", type="general")
    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict timeline for learning roadmap
        
        Args:
            input_data: Should contain 'roadmap' with phases
            
        Returns:
            ETA estimation in days
        """
        roadmap = input_data.get('roadmap', {})
        phases = roadmap.get('phases', [])
        
        # Static formula: calculate ETA based on roadmap structure
        # Base: 7 days per phase
        # Milestone multiplier: +2 days per milestone
        # Resource multiplier: +1 day per 3 resources
        
        base_days_per_phase = 7
        total_eta = 0
        
        for phase in phases:
            phase_days = base_days_per_phase
            
            milestones = phase.get('milestones', [])
            milestone_days = len(milestones) * 2
            
            # Count total resources across all milestones
            total_resources = sum(
                len(milestone.get('resources', []))
                for milestone in milestones
            )
            resource_days = total_resources // 3
            
            total_eta += phase_days + milestone_days + resource_days
        
        # Minimum 14 days, maximum 180 days
        total_eta = max(14, min(total_eta, 180))
        
        return {
            'eta_days': total_eta,
            'calculation': {
                'phases_count': len(phases),
                'base_days_per_phase': base_days_per_phase,
                'total_phases': len(phases),
                'estimated_days': total_eta
            },
            'formula': 'base(7 days/phase) + milestones(2 days each) + resources(1 day per 3)'
        }
