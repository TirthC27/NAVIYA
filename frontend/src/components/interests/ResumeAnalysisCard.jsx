/**
 * ResumeAnalysisCard Component
 * 
 * Displays resume analysis results including:
 * - Overall score with visual gauge
 * - Quality score breakdown
 * - Missing elements
 * - Recommendations
 * - Confidence indicator
 */

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../api/config';
import { 
  DocumentTextIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

// Score ring component for visual display
function ScoreRing({ score, size = 120, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  
  // Color based on score
  const getColor = (s) => {
    if (s >= 80) return '#10B981'; // green
    if (s >= 60) return '#F59E0B'; // amber
    if (s >= 40) return '#F97316'; // orange
    return '#EF4444'; // red
  };
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#374151"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  );
}

// Individual score bar component
function ScoreBar({ label, score, color = 'indigo' }) {
  const colorClasses = {
    indigo: 'bg-indigo-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500'
  };
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{score}/100</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// Confidence badge component
function ConfidenceBadge({ level }) {
  const config = {
    high: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'High Confidence' },
    medium: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Medium Confidence' },
    low: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Low Confidence' }
  };
  
  const { color, label } = config[level] || config.medium;
  
  return (
    <span className={`px-2 py-1 text-xs rounded-full border ${color}`}>
      {label}
    </span>
  );
}

export default function ResumeAnalysisCard({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    if (userId) {
      fetchResumeData();
    }
  }, [userId]);
  
  const fetchResumeData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/resume/dashboard/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch resume data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gray-700 rounded"></div>
          <div className="h-6 w-40 bg-gray-700 rounded"></div>
        </div>
        <div className="h-32 bg-gray-700 rounded"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 text-red-400">
          <ExclamationTriangleIcon className="w-6 h-6" />
          <span>Error loading resume analysis</span>
        </div>
      </div>
    );
  }
  
  if (!data?.has_analysis) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-dashed border-gray-600">
        <div className="flex items-center gap-3 mb-3">
          <DocumentTextIcon className="w-6 h-6 text-gray-500" />
          <h3 className="text-lg font-semibold text-white">Resume Analysis</h3>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Upload your resume to get AI-powered analysis and personalized recommendations.
        </p>
        <div className="flex items-center gap-2 text-indigo-400 text-sm">
          <SparklesIcon className="w-4 h-4" />
          <span>Waiting for resume upload...</span>
        </div>
      </div>
    );
  }
  
  const { analysis, skills } = data;
  const qualityScores = analysis.quality_scores || {};
  
  // Determine if it's tech or medical based on score keys
  const isTech = qualityScores.skill_clarity_score !== undefined;
  
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <DocumentTextIcon className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Resume Analysis</h3>
            <span className="text-xs text-gray-500 capitalize">{analysis.domain} Domain</span>
          </div>
        </div>
        <ConfidenceBadge level={analysis.confidence_level} />
      </div>
      
      {/* Main Score Display */}
      <div className="flex items-center gap-8 mb-6">
        <ScoreRing score={analysis.overall_score || 0} />
        
        <div className="flex-1 space-y-3">
          {isTech ? (
            <>
              <ScoreBar 
                label="Skill Clarity" 
                score={qualityScores.skill_clarity_score || 0} 
                color="indigo" 
              />
              <ScoreBar 
                label="Project Depth" 
                score={qualityScores.project_depth_score || 0} 
                color="blue" 
              />
              <ScoreBar 
                label="ATS Readiness" 
                score={qualityScores.ats_readiness_score || 0} 
                color="purple" 
              />
            </>
          ) : (
            <>
              <ScoreBar 
                label="CV Completeness" 
                score={qualityScores.cv_completeness_score || 0} 
                color="indigo" 
              />
              <ScoreBar 
                label="Clinical Exposure" 
                score={qualityScores.clinical_exposure_score || 0} 
                color="green" 
              />
              <ScoreBar 
                label="Track Alignment" 
                score={qualityScores.track_alignment_score || 0} 
                color="amber" 
              />
            </>
          )}
        </div>
      </div>
      
      {/* Skills Summary */}
      {skills.total_count > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4" />
            Extracted Skills ({skills.total_count})
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(skills.grouped).slice(0, 3).map(([category, skillList]) => (
              <div key={category} className="flex flex-wrap gap-1">
                {skillList.slice(0, 4).map((skill, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded"
                  >
                    {skill}
                  </span>
                ))}
                {skillList.length > 4 && (
                  <span className="px-2 py-1 text-xs bg-gray-600 text-gray-400 rounded">
                    +{skillList.length - 4} more
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        {expanded ? '▼ Hide Details' : '▶ Show Details'}
      </button>
      
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-gray-700 pt-4">
          {/* Missing Elements */}
          {analysis.missing_elements?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                Missing Elements
              </h4>
              <ul className="space-y-1">
                {analysis.missing_elements.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Recommendations */}
          {analysis.recommendations?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                <LightBulbIcon className="w-4 h-4" />
                Recommendations
              </h4>
              <ul className="space-y-1">
                {analysis.recommendations.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Refresh Button */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end">
        <button
          onClick={fetchResumeData}
          className="text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1"
        >
          <ArrowPathIcon className="w-3 h-3" />
          Refresh
        </button>
      </div>
    </div>
  );
}
