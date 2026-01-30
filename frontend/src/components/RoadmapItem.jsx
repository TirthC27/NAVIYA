import { CheckCircle, Circle, PlayCircle } from 'lucide-react';

function RoadmapItem({ item, index, isActive, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center p-4 rounded-lg cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-primary-50 border-2 border-primary-500'
          : 'bg-white border border-gray-200 hover:border-primary-300'
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
        isActive ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
      }`}>
        {index + 1}
      </div>
      <div className="flex-grow">
        <h3 className={`font-medium ${isActive ? 'text-primary-700' : 'text-gray-900'}`}>
          {item.subtopic}
        </h3>
        <p className="text-sm text-gray-500">
          {item.videos?.length || 0} videos
        </p>
      </div>
      <PlayCircle className={`h-5 w-5 ${isActive ? 'text-primary-500' : 'text-gray-400'}`} />
    </div>
  );
}

export default RoadmapItem;
