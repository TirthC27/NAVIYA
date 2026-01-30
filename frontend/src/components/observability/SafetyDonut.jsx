import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const SafetyDonut = ({ data }) => {
  // Default data if none provided
  const chartData = data?.length > 0 ? data : [
    { name: 'Safe', value: 95, color: '#10b981' },
    { name: 'Warnings', value: 4, color: '#f59e0b' },
    { name: 'Blocked', value: 1, color: '#ef4444' },
  ];

  const total = chartData.reduce((acc, item) => acc + item.value, 0);
  const safePercent = chartData.find(d => d.name === 'Safe')?.value || 0;

  return (
    <div className="h-64 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-sm font-medium text-white">{data.name}</p>
                    <p className="text-xs text-gray-400">{data.value}%</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <span className="text-3xl font-bold text-white">{safePercent}%</span>
          <p className="text-xs text-gray-400">Safe</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-400">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SafetyDonut;
