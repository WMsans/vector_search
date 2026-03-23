import { CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Spinner } from '../common';

export default function IndexProgress({ status, onComplete, onIndex, selectedTypes }) {
  const isComplete = status?.phase === 'complete';
  const isPrompt = status?.phase === 'prompt';

  const handleResume = () => {
    if (onIndex && selectedTypes) {
      onIndex(selectedTypes, null, 'resume');
    }
  };

  const handleStartFresh = () => {
    if (onIndex && selectedTypes) {
      onIndex(selectedTypes, null, 'full');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {isPrompt ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <ArrowPathIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Update Index
            </h3>
            <div className="text-gray-600 mb-6 space-y-1">
              {status?.plan?.resumeFiles?.length > 0 && (
                <p>{status.plan.resumeFiles.length} file(s) to resume</p>
              )}
              {status?.plan?.newFiles?.length > 0 && (
                <p>{status.plan.newFiles.length} new file(s) found</p>
              )}
              {status?.plan?.modifiedFiles?.length > 0 && (
                <p>{status.plan.modifiedFiles.length} modified file(s)</p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleResume}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Update Index
              </button>
              <button
                onClick={handleStartFresh}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Start Fresh
              </button>
            </div>
          </div>
        ) : isComplete ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Indexing Complete!
            </h3>
            <p className="text-gray-600 mb-6">
              Successfully indexed {status.documentCount} documents
            </p>
            <button
              onClick={onComplete}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Searching
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Indexing Your Drive
              </h3>
              <Spinner size="sm" className="text-blue-600" />
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{status?.message || 'Preparing...'}</span>
                <span>{status?.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${status?.progress || 0}%` }}
                />
              </div>
            </div>

            {status?.total > 0 && (
              <p className="text-sm text-gray-500 text-center">
                Processing file {status.current} of {status.total}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
