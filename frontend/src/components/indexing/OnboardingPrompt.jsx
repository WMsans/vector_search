import { CloudArrowUpIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { FolderBrowser } from './index';
import { useAuth } from '../../hooks/useAuth';
import { getFolderSelection } from '../../services/storage';

const FILE_TYPES = [
  { id: 'docx', label: 'Word (.docx)' },
  { id: 'pdf', label: 'PDF (.pdf)' },
  { id: 'pptx', label: 'PowerPoint (.pptx)' },
  { id: 'txt', label: 'Text (.txt)' },
];

export default function OnboardingPrompt({ onIndex }) {
  const { accessToken, user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState(['docx', 'pdf', 'pptx', 'txt']);
  const [folderSelection, setFolderSelection] = useState({
    selectedFolderIds: [],
    selectedFileIds: [],
    fileIdToParentFolder: {},
  });
  const [isLoadingSelection, setIsLoadingSelection] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user?.googleId) return;
      try {
        const saved = await getFolderSelection(user.googleId);
        if (saved) {
          setFolderSelection({
            selectedFolderIds: saved.selectedFolderIds || [],
            selectedFileIds: saved.selectedFileIds || [],
            fileIdToParentFolder: saved.fileIdToParentFolder || {},
          });
        }
      } catch (err) {
        console.error('Failed to load saved selection:', err);
      } finally {
        setIsLoadingSelection(false);
      }
    })();
  }, [user?.googleId]);

  const toggleType = (typeId) => {
    setSelectedTypes(prev => 
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const handleFolderSelectionChange = (newSelection) => {
    setFolderSelection(newSelection);
  };

  const handleContinue = () => {
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleIndex = () => {
    onIndex(selectedTypes, folderSelection);
  };

  const hasSelection = folderSelection.selectedFolderIds.length > 0 || folderSelection.selectedFileIds.length > 0;

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="max-w-lg w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6" style={{ backgroundColor: 'var(--theme-accent)', opacity: 0.15 }}>
          <CloudArrowUpIcon className="h-10 w-10" style={{ color: 'var(--theme-accent)' }} />
        </div>
        
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="flex items-center" style={{ color: step >= 1 ? 'var(--theme-accent)' : 'var(--theme-text)', opacity: step >= 1 ? 1 : 0.4 }}>
            <span className="w-7 h-7 rounded-full text-sm flex items-center justify-center text-white" style={{ backgroundColor: step >= 1 ? 'var(--theme-accent)' : 'rgba(128,128,128,0.3)' }}>
              1
            </span>
            <span className="ml-2 text-sm font-medium">Select Folders</span>
          </div>
          <div className="w-8 h-0.5" style={{ backgroundColor: 'rgba(128,128,128,0.3)' }} />
          <div className="flex items-center" style={{ color: step >= 2 ? 'var(--theme-accent)' : 'var(--theme-text)', opacity: step >= 2 ? 1 : 0.4 }}>
            <span className="w-7 h-7 rounded-full text-sm flex items-center justify-center text-white" style={{ backgroundColor: step >= 2 ? 'var(--theme-accent)' : 'rgba(128,128,128,0.3)' }}>
              2
            </span>
            <span className="ml-2 text-sm font-medium">Select File Types</span>
          </div>
        </div>

        {step === 1 && (
          <div className="text-left mb-6">
            {isLoadingSelection ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--theme-accent)' }} />
                <span className="ml-2 text-gray-600">Loading selection...</span>
              </div>
            ) : (
              <FolderBrowser
                accessToken={accessToken}
                extensions={selectedTypes}
                selection={folderSelection}
                onSelectionChange={handleFolderSelectionChange}
              />
            )}
          </div>
        )}

        {step === 1 && (
          <button
            onClick={handleContinue}
            disabled={!hasSelection}
            className="px-6 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          >
            Continue
          </button>
        )}

        {step === 2 && (
          <>
            <p className="mb-6" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              Select which file types to index from selected folders:
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {FILE_TYPES.map(type => (
                <label
                  key={type.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors border-2 relative`}
                  style={{
                    borderColor: selectedTypes.includes(type.id) ? 'var(--theme-accent)' : 'transparent',
                  }}
                >
                  {selectedTypes.includes(type.id) && (
                    <span className="absolute inset-0 rounded-lg" style={{ backgroundColor: 'var(--theme-accent)', opacity: 0.15 }} />
                  )}
                  {!selectedTypes.includes(type.id) && (
                    <span className="absolute inset-0 rounded-lg" style={{ backgroundColor: 'rgba(128,128,128,0.1)' }} />
                  )}
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type.id)}
                    onChange={() => toggleType(type.id)}
                    className="sr-only"
                  />
                  <span className="relative text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                    {type.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleBack}
                className="px-4 py-3 font-medium flex items-center gap-1"
                style={{ color: 'var(--theme-text)', opacity: 0.7 }}
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleIndex}
                disabled={selectedTypes.length === 0}
                className="px-6 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--theme-accent)' }}
              >
                Index Selected Items
              </button>
            </div>
          </>
        )}

        <p className="text-xs mt-4" style={{ color: 'var(--theme-text)', opacity: 0.5 }}>
          {step === 1 
            ? 'Select the folders and files you want to make searchable'
            : 'This may take a few minutes depending on the number of documents'
          }
        </p>
      </div>
    </div>
  );
}
