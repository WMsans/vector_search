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
      <div className="rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4" style={{ backgroundColor: 'var(--theme-bg-2)' }}>
        {isPrompt ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'var(--theme-accent)', opacity: 0.15 }}>
              <ArrowPathIcon className="h-8 w-8" style={{ color: 'var(--theme-accent)' }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--theme-text)' }}>
              Update Index
            </h3>
            <div className="mb-6 space-y-1" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
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
                className="px-6 py-2 text-white rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                Update Index
              </button>
              <button
                onClick={handleStartFresh}
                className="px-6 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'rgba(128,128,128,0.2)', color: 'var(--theme-text)' }}
              >
                Start Fresh
              </button>
            </div>
          </div>
        ) : isComplete ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#22c55e', opacity: 0.15 }}>
              <CheckCircleIcon className="h-8 w-8" style={{ color: '#22c55e' }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--theme-text)' }}>
              Indexing Complete!
            </h3>
            <p className="mb-6" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              Successfully indexed {status.documentCount} documents
            </p>
            <button
              onClick={onComplete}
              className="px-6 py-2 text-white rounded-lg font-medium transition-colors"
              style={{ backgroundColor: 'var(--theme-accent)' }}
            >
              Start Searching
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--theme-text)' }}>
                Indexing Your Drive
              </h3>
              <Spinner size="sm" style={{ color: 'var(--theme-accent)' }} />
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
                <span>{status?.message || 'Preparing...'}</span>
                <span>{status?.progress || 0}%</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: 'rgba(128,128,128,0.2)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${status?.progress || 0}%`, backgroundColor: 'var(--theme-accent)' }}
                />
              </div>
            </div>

            {status?.total > 0 && (
              <p className="text-sm text-center" style={{ color: 'var(--theme-text)', opacity: 0.5 }}>
                Processing file {status.current} of {status.total}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
