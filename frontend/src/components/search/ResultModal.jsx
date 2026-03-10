import { XMarkIcon, DocumentTextIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function ResultModal({ result, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = result.text.split(/\s+/).length;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 pr-8">
            {result.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <DocumentTextIcon className="h-4 w-4" />
              <span>Document chunk</span>
            </div>
            <span>•</span>
            <span>{wordCount} words</span>
          </div>

          <div className="prose prose-gray max-w-none">
            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {result.text}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
