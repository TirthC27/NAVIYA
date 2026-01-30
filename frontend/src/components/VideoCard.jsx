import { ExternalLink, Clock, Eye, ThumbsUp } from 'lucide-react';

function VideoCard({ video }) {
  const formatViews = (views) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views?.toString() || '0';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Thumbnail */}
      <div className="relative">
        <img
          src={video.thumbnail || `https://img.youtube.com/vi/${video.url?.split('v=')[1]}/mqdefault.jpg`}
          alt={video.title}
          className="w-full h-40 object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
          {video.duration}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 text-sm">
          {video.title}
        </h3>
        
        <p className="text-sm text-gray-600 mb-3">
          {video.channel}
        </p>

        {/* Stats */}
        <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
          <div className="flex items-center">
            <Eye className="h-3.5 w-3.5 mr-1" />
            {formatViews(video.views)} views
          </div>
          <div className="flex items-center">
            <Clock className="h-3.5 w-3.5 mr-1" />
            {video.duration}
          </div>
        </div>

        {/* Watch Button */}
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Watch on YouTube
        </a>
      </div>
    </div>
  );
}

export default VideoCard;
