import { SearchResult } from '../types';
import { Search, Book, Newspaper, GraduationCap, Globe } from 'lucide-react';

interface SearchCardsProps {
  results: SearchResult[];
}

export function SearchCards({ results }: SearchCardsProps) {
  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'book': <Book className="w-4 h-4" />,
      'newspaper': <Newspaper className="w-4 h-4" />,
      'graduation-cap': <GraduationCap className="w-4 h-4" />,
      'chart-line': <Newspaper className="w-4 h-4" />,
      'globe': <Globe className="w-4 h-4" />,
    };
    
    return iconMap[iconName] || <Globe className="w-4 h-4" />;
  };

  return (
    <div>
      <div className="text-xs text-slate-400 mb-2 mt-2 flex items-center">
        <Search className="w-3 h-3 mr-1" />
        搜索来源
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
        {results.map((result, index) => (
          <div
            key={index}
            className="search-card bg-white p-3 rounded-lg border border-slate-200 cursor-pointer block"
            onClick={() => result.url && window.open(result.url, '_blank')}
          >
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center text-slate-500 text-xs mr-2">
                {getIconComponent(result.icon)}
              </div>
              <span className="text-xs text-slate-400 truncate">{result.site}</span>
            </div>
            <h4 className="text-sm text-slate-700 leading-tight mb-1 line-clamp-2">
              {result.title}
            </h4>
            <p className="text-xs text-slate-500 line-clamp-2">{result.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}