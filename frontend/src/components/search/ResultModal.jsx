import { XMarkIcon, DocumentTextIcon, ClipboardDocumentIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function ResultModal({ result, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => {
    if (result.drive_file_id) {
      window.open(`https://drive.google.com/file/d/${result.drive_file_id}/view`, '_blank', 'noopener,noreferrer');
    }
  };

  const wordCount = result.text.split(/\s+/).length;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        style={{ backgroundColor: 'var(--theme-bg-2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
          <h2 className="text-xl font-bold pr-8" style={{ color: 'var(--theme-text)' }}>
            {result.title}
          </h2>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--theme-text)', opacity: 0.5 }}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="flex items-center gap-4 mb-4 text-sm" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
            <div className="flex items-center gap-1">
              <DocumentTextIcon className="h-4 w-4" />
              <span>Document chunk</span>
            </div>
            <span>•</span>
            <span>{wordCount} words</span>
          </div>

          <div className="prose prose-gray max-w-none">
            <p className="whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--theme-text)', opacity: 0.8 }}>
              {result.text}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t" style={{ borderColor: 'rgba(128,128,128,0.2)', backgroundColor: 'var(--theme-bg-1)' }}>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 transition-colors"
            style={{ color: 'var(--theme-text)', opacity: 0.8 }}
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
          {result.drive_file_id && (
            <button
              onClick={handleOpen}
              className="flex items-center gap-2 px-4 py-2 transition-colors"
              style={{ color: 'var(--theme-text)', opacity: 0.8 }}
              title="Open in Google Drive"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Open in Drive
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
