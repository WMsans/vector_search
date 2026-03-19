import Dexie from 'dexie';

const db = new Dexie('vectorSearchDB');

db.version(1).stores({
  userProfile: 'googleId',
  documents: '++id, googleId, driveFileId, title, fileType, indexedAt, [googleId+driveFileId]',
  chunks: '++id, documentId, googleId',
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

export default db;
