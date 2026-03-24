import { ClipboardDocumentIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function ChunkPreview({ chunk, onClick }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(chunk.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = (e) => {
    e.stopPropagation();
    if (chunk.drive_file_id) {
      window.open(`https://docs.google.com/document/d/${chunk.drive_file_id}/edit`, '_blank', 'noopener,noreferrer');
    }
  };

  const wordCount = chunk.text.split(/\s+/).length;

  return (
    <div
      onClick={onClick}
      className="rounded-lg border p-4 hover:shadow-sm transition-all cursor-pointer"
      style={{ 
        backgroundColor: 'var(--theme-bg-1)', 
        borderColor: 'rgba(128,128,128,0.15)',
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm line-clamp-2 flex-1" style={{ color: 'var(--theme-text)', opacity: 0.85 }}>
          {chunk.text}
        </p>
        <span className="flex-shrink-0 ml-2 px-2 py-0.5 text-xs font-medium rounded-full relative" style={{ color: 'var(--theme-accent)' }}>
          <span className="absolute inset-0 rounded-full" style={{ backgroundColor: 'var(--theme-accent)', opacity: 0.15 }}></span>
          <span className="relative">{chunk.score}%</span>
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--theme-text)', opacity: 0.5 }}>
          {wordCount} words
        </span>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--theme-text)', opacity: 0.5 }}
          >
            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
            {copied ? 'Copied' : 'Copy'}
          </button>
          {chunk.drive_file_id && (
            <button
              onClick={handleOpen}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'var(--theme-text)', opacity: 0.5 }}
              title="Open in Google Docs"
            >
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
