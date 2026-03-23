import { ChevronRightIcon, ChevronDownIcon, FolderIcon, DocumentIcon } from '@heroicons/react/24/outline';

export default function FolderTreeItem({ 
  item, 
  isSelected, 
  isPartial,
  onToggle, 
  onExpand, 
  children,
  isExpanded,
  isLoading,
  level = 0 
}) {
  const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
  const hasChildren = children && children.length > 0;

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    onToggle(item);
  };

  return (
    <div>
      <div 
        className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {isFolder && (
          <button
            onClick={() => onExpand(item.id)}
            className="p-0.5 hover:bg-gray-200 rounded"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            ) : isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
        {!isFolder && <div className="w-5" />}
        
        <input
          type="checkbox"
          checked={isSelected}
          ref={el => {
            if (el) el.indeterminate = isPartial && !isSelected;
          }}
          onChange={handleCheckboxChange}
          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        
        {isFolder ? (
          <FolderIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
        ) : (
          <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
        
        <span className="text-sm text-gray-700 truncate">{item.name}</span>
      </div>
      
      {isFolder && isExpanded && hasChildren && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
}
