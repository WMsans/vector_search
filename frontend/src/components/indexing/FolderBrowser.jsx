import { useState, useEffect, useCallback } from 'react';
import FolderTreeItem from './FolderTreeItem';
import { listRootItems, listFolderContents } from '../../services/drive';
import { Spinner } from '../common';

export default function FolderBrowser({ 
  accessToken, 
  extensions,
  selection,
  onSelectionChange 
}) {
  const [rootItems, setRootItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [folderContents, setFolderContents] = useState({});
  const [loadingFolders, setLoadingFolders] = useState(new Set());

  const loadRootItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRootItems(accessToken, extensions);
      setRootItems(data.files || []);
    } catch (err) {
      console.error('Failed to load root items:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, extensions]);

  useEffect(() => {
    loadRootItems();
  }, [loadRootItems]);

  const handleExpand = useCallback(async (folderId) => {
    if (expandedFolders[folderId]) {
      setExpandedFolders(prev => {
        const next = { ...prev };
        delete next[folderId];
        return next;
      });
      return;
    }

    setLoadingFolders(prev => new Set([...prev, folderId]));
    
    try {
      const data = await listFolderContents(accessToken, folderId, extensions);
      setFolderContents(prev => ({
        ...prev,
        [folderId]: data.files || [],
      }));
      setExpandedFolders(prev => ({
        ...prev,
        [folderId]: true,
      }));
    } catch (err) {
      console.error('Failed to load folder contents:', err);
    } finally {
      setLoadingFolders(prev => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    }
  }, [accessToken, extensions, expandedFolders]);

  const isItemSelected = (item) => {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      return selection.selectedFolderIds.includes(item.id);
    }
    return selection.selectedFileIds.includes(item.id);
  };

  const isItemPartial = (item) => {
    if (item.mimeType !== 'application/vnd.google-apps.folder') return false;
    
    const contents = folderContents[item.id] || [];
    if (contents.length === 0) return false;
    
    const selectedCount = contents.filter(child => isItemSelected(child)).length;
    return selectedCount > 0 && selectedCount < contents.length;
  };

  const handleToggle = useCallback((item) => {
    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
    const key = isFolder ? 'selectedFolderIds' : 'selectedFileIds';
    const currentList = selection[key];
    
    if (currentList.includes(item.id)) {
      onSelectionChange({
        ...selection,
        [key]: currentList.filter(id => id !== item.id),
      });
    } else {
      onSelectionChange({
        ...selection,
        [key]: [...currentList, item.id],
      });
    }
  }, [selection, onSelectionChange]);

  const handleSelectAll = () => {
    const allFolderIds = rootItems
      .filter(item => item.mimeType === 'application/vnd.google-apps.folder')
      .map(item => item.id);
    const allFileIds = rootItems
      .filter(item => item.mimeType !== 'application/vnd.google-apps.folder')
      .map(item => item.id);
    
    onSelectionChange({
      selectedFolderIds: allFolderIds,
      selectedFileIds: allFileIds,
    });
  };

  const handleDeselectAll = () => {
    onSelectionChange({
      selectedFolderIds: [],
      selectedFileIds: [],
    });
  };

  const renderItems = (items, level = 0) => {
    return items.map(item => (
      <FolderTreeItem
        key={item.id}
        item={item}
        isSelected={isItemSelected(item)}
        isPartial={isItemPartial(item)}
        onToggle={handleToggle}
        onExpand={handleExpand}
        isExpanded={expandedFolders[item.id]}
        isLoading={loadingFolders.has(item.id)}
        level={level}
      >
        {expandedFolders[item.id] && folderContents[item.id] && (
          renderItems(folderContents[item.id], level + 1)
        )}
      </FolderTreeItem>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
        <span className="ml-2 text-gray-600">Loading your Drive...</span>
      </div>
    );
  }

  const totalSelected = selection.selectedFolderIds.length + selection.selectedFileIds.length;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Select folders to index</h3>
        <p className="text-sm text-gray-500">Choose which folders and files to include in your search index</p>
      </div>
      
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleSelectAll}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Select all
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={handleDeselectAll}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Deselect all
        </button>
        {totalSelected > 0 && (
          <span className="ml-auto text-sm text-gray-500">
            {totalSelected} selected
          </span>
        )}
      </div>
      
      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg bg-white max-h-80">
        {rootItems.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No folders or files found
          </div>
        ) : (
          <div className="py-1">
            {renderItems(rootItems)}
          </div>
        )}
      </div>
    </div>
  );
}
