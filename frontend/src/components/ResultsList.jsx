import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ResultCard from './search/ResultCard';
import { ResultCardSkeleton } from './common/Skeleton';

export default function ResultsList({ results, isLoading, onResultClick }) {
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <ResultCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <MagnifyingGlassIcon className="h-12 w-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">Search your documents</p>
        <p className="text-sm">Enter a query above to get started</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <MagnifyingGlassIcon className="h-12 w-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">No results found</p>
        <p className="text-sm">Try different keywords or broader terms</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Found {results.length} result{results.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-gray-500">Sorted by relevance</p>
      </div>
      <div className="space-y-4">
        {results.map((result, idx) => (
          <ResultCard
            key={idx}
            result={result}
            rank={idx + 1}
            onClick={() => onResultClick(result)}
          />
        ))}
      </div>
    </div>
  );
}
