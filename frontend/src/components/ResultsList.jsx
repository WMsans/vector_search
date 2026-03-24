import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';
import FileGroupCard from './search/FileGroupCard';
import { ResultCardSkeleton } from './common/Skeleton';

export default function ResultsList({ results, isLoading, onResultClick }) {
  const groupedResults = useMemo(() => {
    if (!results) return [];

    const groups = results.reduce((acc, result) => {
      const key = result.drive_file_id || result.title;
      if (!acc[key]) {
        acc[key] = {
          driveFileId: key,
          title: result.title,
          chunks: [],
        };
      }
      acc[key].chunks.push(result);
      return acc;
    }, {});

    return Object.values(groups).sort((a, b) => {
      const aBestScore = Math.max(...a.chunks.map(c => c.score));
      const bBestScore = Math.max(...b.chunks.map(c => c.score));
      return bBestScore - aBestScore;
    });
  }, [results]);

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
          Found {results.length} result{results.length !== 1 ? 's' : ''} in {groupedResults.length} file{groupedResults.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-gray-500">Sorted by relevance</p>
      </div>
      <div>
        {groupedResults.map((group, idx) => (
          <FileGroupCard
            key={group.driveFileId || idx}
            group={group}
            onChunkClick={onResultClick}
          />
        ))}
      </div>
    </div>
  );
}
