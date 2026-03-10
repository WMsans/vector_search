import { CloudArrowUpIcon, DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function OnboardingPrompt({ onIndex }) {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="max-w-lg text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
          <CloudArrowUpIcon className="h-10 w-10 text-blue-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to Vector Search
        </h2>
        
        <p className="text-gray-600 mb-8">
          Get started by indexing your Google Drive documents. This will allow you to search through your .docx files using natural language.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-gray-50 rounded-lg">
            <DocumentTextIcon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">We scan your .docx files</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <CloudArrowUpIcon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Create semantic embeddings</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <MagnifyingGlassIcon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Enable smart search</p>
          </div>
        </div>

        <button
          onClick={onIndex}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
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
