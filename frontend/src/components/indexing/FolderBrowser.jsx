import { useState, useEffect, useCallback } from 'react';
import FolderTreeItem from './FolderTreeItem';
import SearchBar from './SearchBar';
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
  const [nextPageTokens, setNextPageTokens] = useState({});
  const [loadingMore, setLoadingMore] = useState(null);
  const [fileIdToParentFolder, setFileIdToParentFolder] = useState(
    selection?.fileIdToParentFolder || {}
  );

  const loadRootItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRootItems(accessToken, extensions);
      setRootItems(data.files || []);
      setNextPageTokens(prev => ({ ...prev, root: data.nextPageToken || null }));
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
      const files = data.files || [];
      setFolderContents(prev => ({
        ...prev,
        [folderId]: files,
      }));
      setFileIdToParentFolder(prev => {
        const next = { ...prev };
        files.forEach(file => {
          if (file.mimeType !== 'application/vnd.google-apps.folder') {
            next[file.id] = folderId;
          }
        });
        return next;
      });
      setNextPageTokens(prev => ({ ...prev, [folderId]: data.nextPageToken || null }));
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

  const handleLoadMore = useCallback(async (folderId = null) => {
    const key = folderId || 'root';
    const pageToken = nextPageTokens[key];
    if (!pageToken || loadingMore === key) return;

    setLoadingMore(key);
    try {
      if (folderId) {
        const data = await listFolderContents(accessToken, folderId, extensions, pageToken);
        const newFiles = data.files || [];
        setFolderContents(prev => ({
          ...prev,
          [folderId]: [...(prev[folderId] || []), ...newFiles],
        }));
        setFileIdToParentFolder(prev => {
          const next = { ...prev };
          newFiles.forEach(file => {
            if (file.mimeType !== 'application/vnd.google-apps.folder') {
              next[file.id] = folderId;
            }
          });
          return next;
        });
        setNextPageTokens(prev => ({ ...prev, [folderId]: data.nextPageToken || null }));
      } else {
        const data = await listRootItems(accessToken, extensions, pageToken);
        setRootItems(prev => [...prev, ...(data.files || [])]);
        setNextPageTokens(prev => ({ ...prev, root: data.nextPageToken || null }));
      }
    } catch (err) {
      console.error('Failed to load more items:', err);
    } finally {
      setLoadingMore(null);
    }
  }, [accessToken, extensions, nextPageTokens, loadingMore]);

  const isItemSelected = (item) => {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      return selection.selectedFolderIds.includes(item.id);
    }
    // A file is selected if explicitly in selectedFileIds OR if its parent folder is fully selected
    if (selection.selectedFileIds.includes(item.id)) return true;
    const parentFolderId = fileIdToParentFolder[item.id];
    if (parentFolderId && selection.selectedFolderIds.includes(parentFolderId)) return true;
    return false;
  };

  const isItemPartial = (item) => {
    if (item.mimeType !== 'application/vnd.google-apps.folder') return false;
    if (selection.selectedFolderIds.includes(item.id)) return false;
    
    // Check via fileIdToParentFolder mapping
    const hasSelectedFiles = selection.selectedFileIds.some(
      fileId => fileIdToParentFolder[fileId] === item.id
    );
    if (hasSelectedFiles) return true;
    
    // Also check loaded folder contents directly (handles cases where
    // fileIdToParentFolder mapping isn't yet populated for all children)
    const contents = folderContents[item.id];
    if (contents) {
      const childFileIds = contents
        .filter(child => child.mimeType !== 'application/vnd.google-apps.folder')
        .map(child => child.id);
      return childFileIds.some(id => selection.selectedFileIds.includes(id));
    }
    
    return false;
  };

  const handleToggle = useCallback((item) => {
    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
    
    if (isFolder) {
      const isCurrentlySelected = selection.selectedFolderIds.includes(item.id);
      const contents = folderContents[item.id] || [];
      const childFileIds = contents
        .filter(child => child.mimeType !== 'application/vnd.google-apps.folder')
        .map(child => child.id);
      // Also find files mapped to this folder via fileIdToParentFolder (covers cases
      // where folder contents haven't been re-loaded, e.g., after page refresh)
      const mappedFileIds = Object.entries(fileIdToParentFolder)
        .filter(([, parentId]) => parentId === item.id)
        .map(([fileId]) => fileId);
      const allChildFileIds = [...new Set([...childFileIds, ...mappedFileIds])];
      
      if (isCurrentlySelected) {
        // Deselect folder: remove folder and all its known children
        const newFileIdToParentFolder = { ...fileIdToParentFolder };
        allChildFileIds.forEach(id => delete newFileIdToParentFolder[id]);
        onSelectionChange({
          selectedFolderIds: selection.selectedFolderIds.filter(id => id !== item.id),
          selectedFileIds: selection.selectedFileIds.filter(id => !allChildFileIds.includes(id)),
          fileIdToParentFolder: newFileIdToParentFolder,
        });
      } else {
        // Select folder: add folder and all its loaded children
        const newFileIdToParentFolder = { ...fileIdToParentFolder };
        childFileIds.forEach(id => {
          newFileIdToParentFolder[id] = item.id;
        });
        const newFileIds = [...new Set([...selection.selectedFileIds, ...childFileIds])];
        // Also remove any individually-selected files that are children of this folder
        // (they're now covered by the folder-level selection)
        onSelectionChange({
          selectedFolderIds: [...selection.selectedFolderIds, item.id],
          selectedFileIds: newFileIds,
          fileIdToParentFolder: newFileIdToParentFolder,
        });
      }
    } else {
      const parentFolderId = fileIdToParentFolder[item.id];
      const parentIsSelected = parentFolderId && selection.selectedFolderIds.includes(parentFolderId);
      const isCurrentlySelected = selection.selectedFileIds.includes(item.id) || parentIsSelected;
      
      if (isCurrentlySelected) {
        // Deselecting a file
        let newFolderIds = selection.selectedFolderIds;
        let newFileIds = selection.selectedFileIds.filter(id => id !== item.id);
        
        if (parentIsSelected) {
          // Demote: remove folder from selectedFolderIds, add all OTHER sibling files individually
          newFolderIds = selection.selectedFolderIds.filter(id => id !== parentFolderId);
          const siblingFiles = (folderContents[parentFolderId] || [])
            .filter(child => child.mimeType !== 'application/vnd.google-apps.folder' && child.id !== item.id);
          const siblingIds = siblingFiles.map(f => f.id);
          newFileIds = [...new Set([...newFileIds, ...siblingIds])];
          // Ensure sibling mappings exist
          const newFileIdToParentFolder = { ...fileIdToParentFolder };
          siblingFiles.forEach(f => { newFileIdToParentFolder[f.id] = parentFolderId; });
          delete newFileIdToParentFolder[item.id];
          onSelectionChange({
            selectedFolderIds: newFolderIds,
            selectedFileIds: newFileIds,
            fileIdToParentFolder: newFileIdToParentFolder,
          });
        } else {
          const newFileIdToParentFolder = { ...fileIdToParentFolder };
          delete newFileIdToParentFolder[item.id];
          onSelectionChange({
            ...selection,
            selectedFileIds: newFileIds,
            fileIdToParentFolder: newFileIdToParentFolder,
          });
        }
      } else {
        // Selecting a file
        const newFileIds = [...selection.selectedFileIds, item.id];
        const newFileIdToParentFolder = { ...fileIdToParentFolder };
        // fileIdToParentFolder should already have the mapping from folder expansion,
        // but ensure it's set if available from the item's parents array
        if (parentFolderId) {
          newFileIdToParentFolder[item.id] = parentFolderId;
        }
        
        // Check if all sibling files are now selected → promote to folder selection
        if (parentFolderId && folderContents[parentFolderId]) {
          const allSiblingFileIds = folderContents[parentFolderId]
            .filter(child => child.mimeType !== 'application/vnd.google-apps.folder')
            .map(child => child.id);
          const allSiblingsSelected = allSiblingFileIds.length > 0 && allSiblingFileIds.every(
            id => id === item.id || newFileIds.includes(id)
          );
          
          if (allSiblingsSelected) {
            // Promote: add folder to selectedFolderIds, remove individual files from selectedFileIds
            onSelectionChange({
              selectedFolderIds: [...selection.selectedFolderIds, parentFolderId],
              selectedFileIds: newFileIds,
              fileIdToParentFolder: newFileIdToParentFolder,
            });
            return;
          }
        }
        
        onSelectionChange({
          ...selection,
          selectedFileIds: newFileIds,
          fileIdToParentFolder: newFileIdToParentFolder,
        });
      }
    }
  }, [selection, onSelectionChange, folderContents, fileIdToParentFolder]);

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
      fileIdToParentFolder,
    });
  };

  const handleDeselectAll = () => {
    onSelectionChange({
      selectedFolderIds: [],
      selectedFileIds: [],
      fileIdToParentFolder: {},
    });
  };

  const renderItems = (items, level = 0, folderId = null) => {
    const key = folderId || 'root';
    const hasMore = !!nextPageTokens[key];
    const isLoadingMore = loadingMore === key;

    const result = items.map(item => (
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
          renderItems(folderContents[item.id], level + 1, item.id)
        )}
      </FolderTreeItem>
    ));

    if (hasMore) {
      result.push(
        <button
          key={`load-more-${key}`}
          onClick={() => handleLoadMore(folderId)}
          disabled={isLoadingMore}
          className="w-full py-2 text-sm hover:opacity-80 flex items-center justify-center gap-2"
          style={{ color: 'var(--theme-accent)' }}
        >
          {isLoadingMore ? (
            <>
              <Spinner size="sm" />
              Loading...
            </>
          ) : (
            'Load more'
          )}
        </button>
      );
    }

    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
        <span className="ml-2" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>Loading your Drive...</span>
      </div>
    );
  }

  const totalSelected = selection.selectedFolderIds.length + selection.selectedFileIds.length;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>Select folders to index</h3>
        <p className="text-sm" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>Choose which folders and files to include in your search index</p>
      </div>
      
      <SearchBar
        accessToken={accessToken}
        extensions={extensions}
        onSelect={handleToggle}
      />
      
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleSelectAll}
          className="text-sm hover:opacity-80"
          style={{ color: 'var(--theme-accent)' }}
        >
          Select all
        </button>
        <span style={{ color: 'var(--theme-text)', opacity: 0.3 }}>|</span>
        <button
          onClick={handleDeselectAll}
          className="text-sm hover:opacity-80"
          style={{ color: 'var(--theme-accent)' }}
        >
          Deselect all
        </button>
        {totalSelected > 0 && (
          <span className="ml-auto text-sm" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
            {totalSelected} selected
          </span>
        )}
      </div>
      
      <div className="flex-1 overflow-auto rounded-lg max-h-80" style={{ border: '1px solid rgba(128,128,128,0.2)', backgroundColor: 'var(--theme-bg-2)' }}>
        {rootItems.length === 0 ? (
          <div className="p-4 text-center" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
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
