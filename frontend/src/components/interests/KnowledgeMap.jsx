import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { Folder, FileText, CheckCircle2 } from 'lucide-react';

// Category Node Component
const CategoryNode = ({ data }) => {
  const { category, count, progress, color, onClick } = data;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      onClick={() => onClick?.(category)}
      className={`
        min-w-[160px] p-4 rounded-2xl cursor-pointer transition-all duration-200
        bg-gradient-to-br ${color} border border-white/10
        hover:shadow-lg hover:shadow-purple-500/20
      `}
    >
      <div className="flex items-center gap-3 mb-2">
        <Folder className="w-5 h-5 text-white" />
        <span className="text-white font-semibold">{category}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70">{count} topics</span>
        <span className="text-white font-medium">{progress}%</span>
      </div>
      <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div 
          className="h-full bg-white/80 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
};

// Topic Node Component
const TopicNode = ({ data }) => {
  const { topic, progress, onClick } = data;
  const isCompleted = progress === 100;

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      onClick={() => onClick?.(topic)}
      className={`
        min-w-[200px] max-w-[240px] p-3 rounded-xl cursor-pointer transition-all duration-200
        ${isCompleted 
          ? 'bg-green-500/20 border border-green-500/50' 
          : 'bg-gray-800/80 border border-gray-700/50 hover:border-purple-500/30'}
      `}
    >
      <div className="flex items-start gap-2">
        {isCompleted ? (
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
        ) : (
          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium line-clamp-2 ${isCompleted ? 'text-green-300' : 'text-white'}`}>
            {topic}
          </span>
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isCompleted ? 'bg-green-400' : 'bg-gradient-to-r from-purple-500 to-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const nodeTypes = {
  categoryNode: CategoryNode,
  topicNode: TopicNode,
};

const categoryColors = {
  'Frontend': 'from-blue-600 to-cyan-600',
  'Backend': 'from-green-600 to-emerald-600',
  'AI/ML': 'from-purple-600 to-pink-600',
  'DevOps': 'from-orange-600 to-amber-600',
  'Mobile': 'from-rose-600 to-red-600',
  'General': 'from-gray-600 to-slate-600',
};

const KnowledgeMap = ({ topicGroups = {}, onTopicSelect }) => {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = [];
    const edges = [];
    
    // Create center node
    nodes.push({
      id: 'center',
      type: 'default',
      position: { x: 300, y: 200 },
      data: { label: '🧠 Your Knowledge' },
      style: {
        background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '16px',
        fontWeight: 'bold',
        border: 'none',
      },
    });

    // Create category nodes in a circle around center
    const categories = Object.keys(topicGroups);
    const radius = 200;
    
    categories.forEach((category, index) => {
      const plans = topicGroups[category];
      const angle = (index / categories.length) * 2 * Math.PI - Math.PI / 2;
      const x = 300 + radius * Math.cos(angle);
      const y = 200 + radius * Math.sin(angle);
      
      const avgProgress = plans.reduce((acc, p) => acc + (p.progress || 0), 0) / plans.length;

      nodes.push({
        id: `category-${category}`,
        type: 'categoryNode',
        position: { x: x - 80, y: y - 40 },
        data: {
          category,
          count: plans.length,
          progress: Math.round(avgProgress),
          color: categoryColors[category] || categoryColors['General'],
          onClick: onTopicSelect,
        },
      });

      edges.push({
        id: `edge-center-${category}`,
        source: 'center',
        target: `category-${category}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6b7280', strokeWidth: 2 },
      });

      // Add topic nodes around each category
      const topicRadius = 120;
      plans.slice(0, 5).forEach((plan, topicIndex) => {
        const topicAngle = angle + ((topicIndex - 2) / 5) * Math.PI * 0.4;
        const topicX = x + topicRadius * Math.cos(topicAngle);
        const topicY = y + topicRadius * Math.sin(topicAngle);

        nodes.push({
          id: `topic-${plan.plan_id || topicIndex}`,
          type: 'topicNode',
          position: { x: topicX - 100, y: topicY - 25 },
          data: {
            topic: plan.topic,
            progress: plan.progress || 0,
            onClick: () => onTopicSelect?.(plan),
          },
        });

        edges.push({
          id: `edge-${category}-${plan.plan_id || topicIndex}`,
          source: `category-${category}`,
          target: `topic-${plan.plan_id || topicIndex}`,
          type: 'smoothstep',
          style: { stroke: '#4b5563', strokeWidth: 1 },
        });
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [topicGroups, onTopicSelect]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Empty state
  if (Object.keys(topicGroups).length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="mb-2">No learning history yet</p>
          <p className="text-sm">Start exploring topics to build your knowledge map!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#333" gap={20} size={1} variant="dots" />
        <Controls 
          className="!bg-gray-800/80 !border-gray-700 !rounded-xl overflow-hidden"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
};

export default KnowledgeMap;
