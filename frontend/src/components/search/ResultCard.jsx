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
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
            {rank}
          </span>
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {result.title}
          </h3>
        </div>
        <span className="flex-shrink-0 ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
          {result.score}%
        </span>
      </div>

      <p className="text-gray-700 mb-4 line-clamp-3">
        {result.text}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
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
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {result.drive_file_id && (
            <button
              onClick={handleOpen}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
