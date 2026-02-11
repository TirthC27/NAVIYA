/**
 * AgentActivationVisual — Multi-Agent Explanation Animation
 *
 * Cinematic animation showing NAVIYA's AI agent nodes activating
 * in sequence with supervisor routing lines. Used during onboarding
 * Phase 2 to explain the multi-agent architecture visually.
 */

import { motion } from 'framer-motion';
import {
  FileText, Route, Zap, MessageSquare, Brain, Sparkles
} from 'lucide-react';

const agents = [
  { id: 'supervisor', label: 'Supervisor', icon: Brain, color: '#8b5cf6', x: 50, y: 15 },
  { id: 'resume', label: 'Resume Agent', icon: FileText, color: '#3b82f6', x: 15, y: 55 },
  { id: 'roadmap', label: 'Roadmap Agent', icon: Route, color: '#10b981', x: 50, y: 75 },
  { id: 'skills', label: 'Skills Agent', icon: Zap, color: '#f59e0b', x: 85, y: 55 },
  { id: 'mentor', label: 'Mentor', icon: MessageSquare, color: '#06b6d4', x: 50, y: 45 },
];

const connections = [
  { from: 'supervisor', to: 'resume' },
  { from: 'supervisor', to: 'roadmap' },
  { from: 'supervisor', to: 'skills' },
  { from: 'supervisor', to: 'mentor' },
];

const AgentActivationVisual = ({ animate = true }) => {
  return (
    <div className="relative w-full h-52 overflow-hidden">
      {/* Connection lines (SVG) */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {connections.map((conn, i) => {
          const from = agents.find(a => a.id === conn.from);
          const to = agents.find(a => a.id === conn.to);
          return (
            <motion.line
              key={i}
              x1={`${from.x}%`} y1={`${from.y}%`}
              x2={`${to.x}%`} y2={`${to.y}%`}
              stroke="rgba(139, 92, 246, 0.3)"
              strokeWidth="0.4"
              strokeDasharray="2 2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={animate ? { pathLength: 1, opacity: 1 } : {}}
              transition={{ duration: 1, delay: 0.5 + i * 0.2 }}
            />
          );
        })}
        
        {/* Data flow pulse */}
        {animate && connections.map((conn, i) => {
          const from = agents.find(a => a.id === conn.from);
          const to = agents.find(a => a.id === conn.to);
          return (
            <motion.circle
              key={`pulse-${i}`}
              r="0.8"
              fill={from.color}
              initial={{ cx: `${from.x}%`, cy: `${from.y}%`, opacity: 0 }}
              animate={{
                cx: [`${from.x}%`, `${to.x}%`],
                cy: [`${from.y}%`, `${to.y}%`],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 2,
                delay: 1 + i * 0.3,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            />
          );
        })}
      </svg>

      {/* Agent nodes */}
      {agents.map((agent, i) => (
        <motion.div
          key={agent.id}
          className="absolute flex flex-col items-center"
          style={{
            left: `${agent.x}%`,
            top: `${agent.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          initial={animate ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            damping: 15,
            stiffness: 200,
            delay: i * 0.15,
          }}
        >
          {/* Glow ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: `0 0 20px ${agent.color}30` }}
            animate={animate ? { scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] } : {}}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
          />

          {/* Node */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: `${agent.color}15`,
              borderColor: `${agent.color}30`,
            }}
          >
            <agent.icon
              className="w-4 h-4"
              style={{ color: agent.color }}
            />
          </div>

          {/* Label */}
          <span className="text-[10px] text-slate-400 mt-1.5 whitespace-nowrap font-medium">
            {agent.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

export default AgentActivationVisual;
