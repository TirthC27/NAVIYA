import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const RadarScoreChart = ({ data }) => {
  // Default data if none provided
  const chartData = data?.length > 0 ? data : [
    { subject: 'Relevance', score: 0.85 },
    { subject: 'Coherence', score: 0.90 },
    { subject: 'Helpfulness', score: 0.88 },
    { subject: 'Accuracy', score: 0.82 },
    { subject: 'Safety', score: 0.95 },
  ];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid 
            stroke="#374151" 
            strokeDasharray="3 3"
          />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickLine={false}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 1]} 
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickCount={5}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-xs text-gray-400">Current Scores</span>
        </div>
      </div>
    </div>
  );
};

export default RadarScoreChart;
