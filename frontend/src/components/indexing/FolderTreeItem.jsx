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
        className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(128,128,128,0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        {isFolder && (
          <button
            onClick={() => onExpand(item.id)}
            className="p-0.5 rounded"
            disabled={isLoading}
            style={{ accentColor: 'var(--theme-accent)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(128,128,128,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(128,128,128,0.3)', borderTopColor: 'var(--theme-accent)' }} />
            ) : isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" style={{ color: 'var(--theme-text)', opacity: 0.5 }} />
            ) : (
              <ChevronRightIcon className="w-4 h-4" style={{ color: 'var(--theme-text)', opacity: 0.5 }} />
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
          className="w-4 h-4 rounded"
          style={{ accentColor: 'var(--theme-accent)' }}
        />
        
        {isFolder ? (
          <FolderIcon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--theme-accent)' }} />
        ) : (
          <DocumentIcon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--theme-text)', opacity: 0.5 }} />
        )}
        
        <span className="text-sm truncate" style={{ color: 'var(--theme-text)' }}>{item.name}</span>
      </div>
      
      {isFolder && isExpanded && hasChildren && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
}
