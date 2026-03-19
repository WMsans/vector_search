import { CloudArrowUpIcon, DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

const FILE_TYPES = [
  { id: 'docx', label: 'Word (.docx)' },
  { id: 'pdf', label: 'PDF (.pdf)' },
  { id: 'pptx', label: 'PowerPoint (.pptx)' },
  { id: 'txt', label: 'Text (.txt)' },
];

export default function OnboardingPrompt({ onIndex }) {
  const [selectedTypes, setSelectedTypes] = useState(['docx', 'pdf', 'pptx', 'txt']);

  const toggleType = (typeId) => {
    setSelectedTypes(prev => 
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="max-w-lg text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
          <CloudArrowUpIcon className="h-10 w-10 text-blue-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to Vector Search
        </h2>
        
        <p className="text-gray-600 mb-6">
          Select which file types to index from your Google Drive:
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {FILE_TYPES.map(type => (
            <label
              key={type.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                selectedTypes.includes(type.id)
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-gray-100 border-2 border-transparent hover:bg-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes(type.id)}
                onChange={() => toggleType(type.id)}
                className="sr-only"
              />
              <span className={`text-sm font-medium ${
                selectedTypes.includes(type.id) ? 'text-blue-700' : 'text-gray-600'
              }`}>
                {type.label}
              </span>
            </label>
          ))}
        </div>

        <button
          onClick={() => onIndex(selectedTypes)}
          disabled={selectedTypes.length === 0}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Index My Drive
        </button>

        <p className="text-xs text-gray-500 mt-4">
          This may take a few minutes depending on the number of documents
        </p>
      </div>
    </div>
  );
}
