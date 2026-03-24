import { DocumentTextIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import ChunkPreview from './ChunkPreview';

const PREVIEW_COUNT = 2;

export default function FileGroupCard({ group, onChunkClick }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedChunks = [...group.chunks].sort((a, b) => b.score - a.score);
  const bestScore = sortedChunks[0].score;
  const totalChunks = sortedChunks.length;
  const previewChunks = sortedChunks.slice(0, PREVIEW_COUNT);
  const remainingChunks = sortedChunks.slice(PREVIEW_COUNT);
  const hasMore = remainingChunks.length > 0;

  return (
    <div className="rounded-lg border mb-4" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'rgba(128,128,128,0.15)', backgroundColor: 'var(--theme-bg-2)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <DocumentTextIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--theme-accent)' }} />
            <h3 className="text-lg font-semibold truncate" style={{ color: 'var(--theme-text)' }}>
              {group.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="px-2 py-1 text-xs font-medium rounded-full relative" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              {totalChunks} {totalChunks === 1 ? 'match' : 'matches'}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded-full relative" style={{ color: 'var(--theme-accent)' }}>
              <span className="absolute inset-0 rounded-full" style={{ backgroundColor: 'var(--theme-accent)', opacity: 0.15 }}></span>
              <span className="relative">{bestScore}%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3" style={{ backgroundColor: 'var(--theme-bg-1)' }}>
        {previewChunks.map((chunk, idx) => (
          <ChunkPreview
            key={idx}
            chunk={chunk}
            onClick={() => onChunkClick(chunk)}
          />
        ))}

        {hasMore && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1 text-sm font-medium transition-colors mx-auto"
            style={{ color: 'var(--theme-accent)' }}
          >
            <ChevronDownIcon className="h-4 w-4" />
            Show {remainingChunks.length} more
          </button>
        )}

        {isExpanded && remainingChunks.map((chunk, idx) => (
          <ChunkPreview
            key={idx}
            chunk={chunk}
            onClick={() => onChunkClick(chunk)}
          />
        ))}

        {isExpanded && hasMore && (
          <button
            onClick={() => setIsExpanded(false)}
            className="flex items-center gap-1 text-sm font-medium transition-colors mx-auto"
            style={{ color: 'var(--theme-accent)' }}
          >
            <ChevronUpIcon className="h-4 w-4" />
            Show less
          </button>
        )}
      </div>
    </div>
  );
}
