import Dexie from 'dexie';

const db = new Dexie('vectorSearchDB');

db.version(4).stores({
  userProfile: 'googleId',
  documents: '++id, googleId, driveFileId, title, fileType, indexedAt, driveModifiedTime, status, [googleId+driveFileId]',
  chunks: '++id, documentId, googleId',
  folderSelection: 'googleId',
});

export async function saveUser(user) {
  await db.userProfile.put(user);
}

export async function getUser(googleId) {
  return db.userProfile.get(googleId);
}

export async function getDocuments(googleId) {
  return db.documents.where('googleId').equals(googleId).toArray();
}

export async function saveDocument(doc) {
  return db.documents.add({
    googleId: doc.googleId,
    driveFileId: doc.driveFileId,
    title: doc.title,
    fileType: doc.fileType || 'docx',
    indexedAt: doc.indexedAt,
    driveModifiedTime: doc.driveModifiedTime || null,
    status: doc.status || 'pending',
  });
}

export async function deleteAllDocuments(googleId) {
  const docs = await db.documents.where('googleId').equals(googleId).toArray();
  const docIds = docs.map(d => d.id);
  await db.chunks.where('documentId').anyOf(docIds).delete();
  await db.documents.where('googleId').equals(googleId).delete();
}

export async function saveChunks(chunks) {
  await db.chunks.bulkAdd(chunks);
}

export async function getChunks(googleId) {
  return db.chunks.where('googleId').equals(googleId).toArray();
}

export async function getIndexStatus(googleId) {
  const count = await db.documents.where('googleId').equals(googleId).count();
  if (count === 0) {
    return { indexed: false, documentCount: 0, lastIndexedAt: null };
  }
  const docs = await db.documents.where('googleId').equals(googleId).sortBy('indexedAt');
  const lastIndexedAt = docs[docs.length - 1]?.indexedAt || null;
  return { indexed: true, documentCount: count, lastIndexedAt };
}

export async function getIndexedFileIds(googleId) {
  const docs = await db.documents.where('googleId').equals(googleId).toArray();
  return new Set(docs.map(d => d.driveFileId));
}

export async function getPendingDocuments(googleId) {
  return db.documents
    .where('googleId').equals(googleId)
    .filter(d => d.status === 'pending')
    .toArray();
}

export async function getModifiedFiles(googleId, driveFiles) {
  const docs = await db.documents.where('googleId').equals(googleId).toArray();
  const docMap = new Map(docs.map(d => [d.driveFileId, d]));
  
  return driveFiles.filter(file => {
    const doc = docMap.get(file.id);
    if (!doc || !doc.driveModifiedTime) return false;
    return new Date(file.modifiedTime) > new Date(doc.driveModifiedTime);
  });
}

export async function updateDocumentStatus(docId, status, driveModifiedTime) {
  await db.documents.update(docId, { status, driveModifiedTime });
}

export async function deleteDocumentsByFileIds(googleId, fileIds) {
  const docs = await db.documents
    .where('googleId').equals(googleId)
    .filter(d => fileIds.includes(d.driveFileId))
    .toArray();
  const docIds = docs.map(d => d.id);
  await db.chunks.where('documentId').anyOf(docIds).delete();
  await db.documents.bulkDelete(docIds);
}

export async function deleteDocument(docId) {
  await db.chunks.where('documentId').equals(docId).delete();
  await db.documents.delete(docId);
}

export async function saveFolderSelection(googleId, selection) {
  await db.folderSelection.put({
    googleId,
    selectedFolderIds: selection.selectedFolderIds || [],
    selectedFileIds: selection.selectedFileIds || [],
    updatedAt: new Date().toISOString(),
  });
}

export async function getFolderSelection(googleId) {
  return db.folderSelection.get(googleId);
}

export async function clearFolderSelection(googleId) {
  await db.folderSelection.delete(googleId);
}

export default db;
