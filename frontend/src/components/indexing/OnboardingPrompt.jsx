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
  const { accessToken } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState(['docx', 'pdf', 'pptx', 'txt']);
  const [folderSelection, setFolderSelection] = useState({
    selectedFolderIds: [],
    selectedFileIds: [],
  });

  useEffect(() => {
    loadSavedSelection();
  }, []);

  const loadSavedSelection = async () => {
    try {
      const saved = await getFolderSelection('default');
      if (saved) {
        setFolderSelection({
          selectedFolderIds: saved.selectedFolderIds || [],
          selectedFileIds: saved.selectedFileIds || [],
        });
      }
    } catch (err) {
      console.error('Failed to load saved selection:', err);
    }
  };

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
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
          <CloudArrowUpIcon className="h-10 w-10 text-blue-600" />
        </div>
        
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className={`w-7 h-7 rounded-full text-sm flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              1
            </span>
            <span className="ml-2 text-sm font-medium">Select Folders</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-200" />
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className={`w-7 h-7 rounded-full text-sm flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              2
            </span>
            <span className="ml-2 text-sm font-medium">Select File Types</span>
          </div>
        </div>

        {step === 1 && (
          <div className="text-left mb-6">
            <FolderBrowser
              accessToken={accessToken}
              extensions={selectedTypes}
              selection={folderSelection}
              onSelectionChange={handleFolderSelectionChange}
            />
          </div>
        )}

        {step === 1 && (
          <button
            onClick={handleContinue}
            disabled={!hasSelection}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        )}

        {step === 2 && (
          <>
            <p className="text-gray-600 mb-6">
              Select which file types to index from selected folders:
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-6">
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

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleBack}
                className="px-4 py-3 text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleIndex}
                disabled={selectedTypes.length === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Index Selected Items
              </button>
            </div>
          </>
        )}

        <p className="text-xs text-gray-500 mt-4">
          {step === 1 
            ? 'Select the folders and files you want to make searchable'
            : 'This may take a few minutes depending on the number of documents'
          }
        </p>
      </div>
    </div>
  );
}
