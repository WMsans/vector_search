import { DocumentTextIcon, ClipboardDocumentIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function ResultCard({ result, rank, onClick }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = (e) => {
    e.stopPropagation();
    if (result.drive_file_id) {
      window.open(`https://docs.google.com/document/d/${result.drive_file_id}/edit`, '_blank', 'noopener,noreferrer');
    }
  };

  const wordCount = result.text.split(/\s+/).length;

  return (
    <div
      onClick={onClick}
      className="rounded-lg border p-6 hover:shadow-md transition-all cursor-pointer"
      style={{ 
        backgroundColor: 'var(--theme-bg-2)', 
        borderColor: 'rgba(128,128,128,0.2)',
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold relative" style={{ color: 'var(--theme-accent)' }}>
            <span className="absolute inset-0 rounded-full" style={{ backgroundColor: 'var(--theme-accent)', opacity: 0.15 }}></span>
            <span className="relative">{rank}</span>
          </span>
          <h3 className="text-lg font-semibold truncate" style={{ color: 'var(--theme-text)' }}>
            {result.title}
          </h3>
        </div>
        <span className="flex-shrink-0 ml-2 px-2 py-1 text-xs font-medium rounded-full relative" style={{ color: 'var(--theme-accent)' }}>
          <span className="absolute inset-0 rounded-full" style={{ backgroundColor: 'var(--theme-accent)', opacity: 0.15 }}></span>
          <span className="relative">{result.score}%</span>
        </span>
      </div>

      <p className="mb-4 line-clamp-3" style={{ color: 'var(--theme-text)', opacity: 0.8 }}>
        {result.text}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
          <div className="flex items-center gap-1">
            <DocumentTextIcon className="h-4 w-4" />
            <span>Document chunk</span>
          </div>
          <span>•</span>
          <span>{wordCount} words</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-sm transition-colors"
            style={{ color: 'var(--theme-text)', opacity: 0.6 }}
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {result.drive_file_id && (
            <button
              onClick={handleOpen}
              className="flex items-center gap-1 text-sm transition-colors"
              style={{ color: 'var(--theme-text)', opacity: 0.6 }}
              title="Open in Google Docs"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
