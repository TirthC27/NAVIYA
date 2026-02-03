/**
 * RoadmapFlow Component
 * 
 * Displays career roadmap phases using React Flow.
 * Features:
 * - Phase nodes with status indicators
 * - Connection edges between phases
 * - Current phase highlighting
 * - Future phase preview (locked)
 * - Phase detail panel
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Lock, 
  CheckCircle2, 
  PlayCircle, 
  Circle,
  ChevronRight,
  Target,
  Clock,
  BookOpen,
  Trophy
} from 'lucide-react';

// ============================================
// Custom Node Components
// ============================================

/**
 * PhaseNode - Custom node for roadmap phases
 */
function PhaseNode({ data, selected }) {
  const { 
    phase, 
    status, 
    progress, 
    isActive, 
    onClick 
  } = data;
  
  const statusConfig = {
    locked: {
      icon: Lock,
      bgColor: 'bg-gray-800/80',
      borderColor: 'border-gray-600',
      textColor: 'text-gray-400',
      iconColor: 'text-gray-500'
    },
    active: {
      icon: PlayCircle,
      bgColor: 'bg-gradient-to-br from-indigo-900 to-purple-900',
      borderColor: 'border-indigo-500',
      textColor: 'text-white',
      iconColor: 'text-indigo-400'
    },
    completed: {
      icon: CheckCircle2,
      bgColor: 'bg-gradient-to-br from-green-900 to-emerald-900',
      borderColor: 'border-green-500',
      textColor: 'text-white',
      iconColor: 'text-green-400'
    }
  };
  
  const config = statusConfig[status] || statusConfig.locked;
  const StatusIcon = config.icon;
  
  return (
    <div
      onClick={() => onClick && onClick(phase)}
      className={`
        relative w-64 p-4 rounded-xl border-2 cursor-pointer
        transition-all duration-300 transform
        ${config.bgColor} ${config.borderColor}
        ${selected ? 'ring-2 ring-white/50 scale-105' : ''}
        ${status === 'locked' ? 'opacity-70' : ''}
        hover:scale-102
      `}
    >
      {/* Phase Number Badge */}
      <div className={`
        absolute -top-3 -left-3 w-8 h-8 rounded-full 
        flex items-center justify-center text-sm font-bold
        ${status === 'completed' ? 'bg-green-500' : 
          status === 'active' ? 'bg-indigo-500' : 'bg-gray-600'}
        text-white shadow-lg
      `}>
        {phase.phase_number}
      </div>
      
      {/* Status Icon */}
      <div className="absolute -top-3 -right-3">
        <StatusIcon className={`w-6 h-6 ${config.iconColor}`} />
      </div>
      
      {/* Content */}
      <div className="pt-2">
        <h3 className={`font-semibold text-lg ${config.textColor} mb-2`}>
          {phase.phase_title}
        </h3>
        
        {/* Focus Areas Preview */}
        <div className="flex flex-wrap gap-1 mb-3">
          {phase.focus_areas.slice(0, 3).map((area, idx) => (
            <span 
              key={idx}
              className={`
                px-2 py-0.5 text-xs rounded-full
                ${status === 'locked' ? 'bg-gray-700 text-gray-400' : 
                  'bg-white/10 text-white/80'}
              `}
            >
              {area.length > 20 ? area.substring(0, 20) + '...' : area}
            </span>
          ))}
          {phase.focus_areas.length > 3 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-white/5 text-white/50">
              +{phase.focus_areas.length - 3}
            </span>
          )}
        </div>
        
        {/* Progress Bar (for active/completed) */}
        {status !== 'locked' && (
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className={config.textColor}>Progress</span>
              <span className={config.textColor}>{progress}%</span>
            </div>
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  status === 'completed' ? 'bg-green-400' : 'bg-indigo-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* View Details Link */}
        <div className={`
          mt-3 flex items-center gap-1 text-xs ${config.textColor}
          ${status === 'locked' ? 'opacity-50' : 'opacity-80 hover:opacity-100'}
        `}>
          <span>{status === 'locked' ? 'Preview' : 'View Details'}</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}

// Register custom node types
const nodeTypes = {
  phaseNode: PhaseNode,
};

// ============================================
// Main RoadmapFlowView Component
// ============================================

export default function RoadmapFlowView({ 
  roadmap, 
  phaseProgress = [],
  onPhaseClick 
}) {
  const [selectedPhase, setSelectedPhase] = useState(null);
  
  // Build nodes from roadmap phases
  const initialNodes = useMemo(() => {
    if (!roadmap?.phases) return [];
    
    return roadmap.phases.map((phase, index) => {
      // Find progress for this phase
      const progress = phaseProgress.find(p => p.phase_number === phase.phase_number);
      const status = progress?.status || (index === 0 ? 'active' : 'locked');
      const progressPct = progress?.progress_percentage || 0;
      
      // Calculate position (vertical layout)
      const yOffset = index * 200;
      const xOffset = index % 2 === 0 ? 0 : 50; // Slight zigzag
      
      return {
        id: `phase-${phase.phase_number}`,
        type: 'phaseNode',
        position: { x: 200 + xOffset, y: 50 + yOffset },
        data: {
          phase,
          status,
          progress: progressPct,
          isActive: status === 'active',
          onClick: handlePhaseClick
        },
        draggable: false,
      };
    });
  }, [roadmap, phaseProgress]);
  
  // Build edges connecting phases
  const initialEdges = useMemo(() => {
    if (!roadmap?.phases) return [];
    
    return roadmap.phases.slice(0, -1).map((phase, index) => {
      const sourceStatus = phaseProgress.find(p => p.phase_number === phase.phase_number)?.status;
      const isCompleted = sourceStatus === 'completed';
      
      return {
        id: `edge-${phase.phase_number}`,
        source: `phase-${phase.phase_number}`,
        target: `phase-${phase.phase_number + 1}`,
        type: 'smoothstep',
        animated: !isCompleted,
        style: {
          stroke: isCompleted ? '#10B981' : '#6366F1',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCompleted ? '#10B981' : '#6366F1',
        },
      };
    });
  }, [roadmap, phaseProgress]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Update nodes when roadmap or progress changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [roadmap, phaseProgress, initialNodes, initialEdges, setNodes, setEdges]);
  
  const handlePhaseClick = useCallback((phase) => {
    setSelectedPhase(phase);
    if (onPhaseClick) {
      onPhaseClick(phase);
    }
  }, [onPhaseClick]);
  
  if (!roadmap?.phases) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>No roadmap data available</p>
      </div>
    );
  }
  
  // Calculate current phase info
  const currentPhase = phaseProgress.find(p => p.status === 'active');
  const completedCount = phaseProgress.filter(p => p.status === 'completed').length;
  
  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.5}
        maxZoom={1.5}
        attributionPosition="bottom-left"
        className="bg-gray-900"
      >
        <Background color="#374151" gap={20} />
        <Controls 
          className="bg-gray-800 border-gray-700 [&>button]:bg-gray-700 [&>button]:border-gray-600 [&>button]:text-white [&>button:hover]:bg-gray-600"
        />
        
        {/* Info Panel */}
        <Panel position="top-left" className="m-4">
          <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" />
              <span className="font-semibold text-white">
                {roadmap.domain === 'tech' ? 'Tech' : 'Medical'} Roadmap
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">{roadmap.overall_duration_estimate}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">{roadmap.phases.length} Phases</span>
              </div>
            </div>
            
            {/* Progress Summary */}
            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Overall Progress</span>
                <span className="text-white font-medium">
                  {completedCount}/{roadmap.phases.length}
                </span>
              </div>
              <div className="mt-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  style={{ width: `${(completedCount / roadmap.phases.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </Panel>
        
        {/* Legend */}
        <Panel position="bottom-right" className="m-4">
          <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">Status Legend</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">Completed</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <PlayCircle className="w-4 h-4 text-indigo-400" />
                <span className="text-gray-300">Active</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Lock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-300">Locked</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
      
      {/* Phase Detail Modal */}
      {selectedPhase && (
        <PhaseDetailPanel 
          phase={selectedPhase}
          progress={phaseProgress.find(p => p.phase_number === selectedPhase.phase_number)}
          onClose={() => setSelectedPhase(null)}
        />
      )}
    </div>
  );
}

// ============================================
// Phase Detail Panel
// ============================================

function PhaseDetailPanel({ phase, progress, onClose }) {
  const status = progress?.status || 'locked';
  
  return (
    <div 
      className="absolute inset-y-0 right-0 w-96 bg-gray-800 border-l border-gray-700 shadow-2xl z-50 overflow-y-auto"
      style={{ maxHeight: '100%' }}
    >
      {/* Header */}
      <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold
            ${status === 'completed' ? 'bg-green-500' : 
              status === 'active' ? 'bg-indigo-500' : 'bg-gray-600'}
          `}>
            {phase.phase_number}
          </div>
          <h3 className="font-semibold text-white">{phase.phase_title}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {status === 'completed' && (
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </span>
          )}
          {status === 'active' && (
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-sm flex items-center gap-1">
              <PlayCircle className="w-4 h-4" />
              In Progress
            </span>
          )}
          {status === 'locked' && (
            <span className="px-3 py-1 bg-gray-600/50 text-gray-400 rounded-full text-sm flex items-center gap-1">
              <Lock className="w-4 h-4" />
              Locked
            </span>
          )}
        </div>
        
        {/* Progress (if not locked) */}
        {status !== 'locked' && progress && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Progress</span>
              <span className="text-white">{progress.progress_percentage || 0}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  status === 'completed' ? 'bg-green-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${progress.progress_percentage || 0}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Focus Areas */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-400" />
            Focus Areas
          </h4>
          <div className="space-y-2">
            {phase.focus_areas.map((area, idx) => (
              <div 
                key={idx}
                className="p-2 bg-gray-700/50 rounded-lg text-sm text-gray-300"
              >
                {area}
              </div>
            ))}
          </div>
        </div>
        
        {/* Skills/Subjects */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            Skills to Acquire
          </h4>
          <div className="flex flex-wrap gap-2">
            {phase.skills_or_subjects.map((skill, idx) => (
              <span 
                key={idx}
                className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        
        {/* Expected Outcomes */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Expected Outcomes
          </h4>
          <ul className="space-y-1">
            {phase.expected_outcomes.map((outcome, idx) => (
              <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                {outcome}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Completion Criteria */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Completion Criteria
          </h4>
          <ul className="space-y-1">
            {phase.completion_criteria.map((criterion, idx) => (
              <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                <Circle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                {criterion}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
