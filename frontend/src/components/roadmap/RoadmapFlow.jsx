import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { Play, CheckCircle2, Clock, Youtube } from 'lucide-react';

// Custom Node Component
const StepNode = ({ data, selected }) => {
  const { step, onClick } = data;
  const isCompleted = step.status === 'completed';
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={() => onClick(step)}
      className={`
        relative min-w-[280px] max-w-[320px] p-4 rounded-2xl cursor-pointer transition-all duration-200
        ${selected 
          ? 'bg-purple-500/20 border-2 border-purple-500 shadow-lg shadow-purple-500/20' 
          : 'bg-gray-800/80 border border-gray-700/50 hover:border-purple-500/30'}
        ${isCompleted ? 'border-green-500/50' : ''}
      `}
    >
      {/* Step Number Badge */}
      <div className={`
        absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
        ${isCompleted 
          ? 'bg-green-500 text-white' 
          : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'}
      `}>
        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.step_number}
      </div>

      {/* Content */}
      <div className="pl-2">
        <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2">
          {step.step_title}
        </h3>

        {/* Video Info */}
        {step.video && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Youtube className="w-3.5 h-3.5 text-red-400" />
            <span className="truncate flex-1">{step.video.channel || 'Video'}</span>
            {step.video.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {step.video.duration}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Play Indicator */}
      {!isCompleted && (
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Play className="w-3 h-3 text-purple-400 fill-purple-400" />
        </div>
      )}
    </motion.div>
  );
};

const nodeTypes = {
  stepNode: StepNode,
};

const RoadmapFlow = ({ steps = [], onNodeClick, selectedStep }) => {
  // Convert steps to nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = steps.map((step, index) => {
      // Create a visual layout - alternating sides with curves
      const row = Math.floor(index / 2);
      const isEven = index % 2 === 0;
      
      return {
        id: step.id || `step-${index}`,
        type: 'stepNode',
        position: {
          x: isEven ? 100 : 450,
          y: row * 180 + 50,
        },
        data: { 
          step: { ...step, step_number: step.step_number || index + 1 },
          onClick: onNodeClick,
        },
        selected: selectedStep?.id === step.id,
      };
    });

    const edges = steps.slice(0, -1).map((step, index) => ({
      id: `edge-${index}`,
      source: step.id || `step-${index}`,
      target: steps[index + 1].id || `step-${index + 1}`,
      type: 'smoothstep',
      animated: true,
      style: { 
        stroke: 'url(#edge-gradient)', 
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#8b5cf6',
        width: 20,
        height: 20,
      },
    }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [steps, selectedStep, onNodeClick]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when steps change
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="w-full h-full">
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
        proOptions={{ hideAttribution: true }}
      >
        {/* Custom gradient for edges */}
        <svg>
          <defs>
            <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>

        <Background 
          color="#333" 
          gap={20} 
          size={1}
          variant="dots"
        />
        <Controls 
          className="!bg-gray-800/80 !border-gray-700 !rounded-xl overflow-hidden"
          showInteractive={false}
        />
      </ReactFlow>

      {/* Empty State */}
      {steps.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>No steps to display</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapFlow;
