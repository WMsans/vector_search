import { getMimeTypes } from './fileExtractors';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const USERINFO_API = 'https://www.googleapis.com/oauth2/v2/userinfo';

async function fetchWithAuth(url, accessToken, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = new Error(`API request failed: ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res;
}

export async function getUserInfo(accessToken) {
  const res = await fetchWithAuth(USERINFO_API, accessToken);
  return res.json();
}

export async function listRootItems(accessToken, extensions = ['docx'], pageToken = null) {
  const mimeTypes = getMimeTypes(extensions);
  const folderMime = "mimeType='application/vnd.google-apps.folder'";
  const mimeQuery = mimeTypes.map(m => `mimeType='${m}'`).join(' or ');
  const query = `(${folderMime} or ${mimeQuery}) and trashed=false and 'root' in parents`;
  const fields = 'files(id,name,mimeType),nextPageToken';
  let url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=100&orderBy=name`;
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }
  const res = await fetchWithAuth(url, accessToken);
  return res.json();
}

export async function listFolderContents(accessToken, folderId, extensions = ['docx'], pageToken = null) {
  const mimeTypes = getMimeTypes(extensions);
  const folderMime = "mimeType='application/vnd.google-apps.folder'";
  const mimeQuery = mimeTypes.map(m => `mimeType='${m}'`).join(' or ');
  const query = `(${folderMime} or ${mimeQuery}) and trashed=false and '${folderId}' in parents`;
  const fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
  let url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=100&orderBy=name`;
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }
  const res = await fetchWithAuth(url, accessToken);
  return res.json();
}

export async function listFiles(accessToken, extensions = ['docx'], folderIds = null) {
  const mimeTypes = getMimeTypes(extensions);
  
  if (mimeTypes.length === 0) {
    return [];
  }
  
  const mimeQuery = mimeTypes.map(m => `mimeType='${m}'`).join(' or ');
  let query = `(${mimeQuery}) and trashed=false`;
  
  if (folderIds && folderIds.length > 0) {
    const folderQuery = folderIds.map(id => `'${id}' in parents`).join(' or ');
    query += ` and (${folderQuery})`;
  }
  
  const fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
  const allFiles = [];
  let pageToken = null;
  
  do {
    let url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=500&orderBy=name`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }
    const res = await fetchWithAuth(url, accessToken);
    const data = await res.json();
    if (data.files) {
      allFiles.push(...data.files);
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  
  return allFiles;
}

export async function downloadFile(accessToken, fileId) {
  const url = `${DRIVE_API}/files/${fileId}?alt=media`;
  const res = await fetchWithAuth(url, accessToken);
  return res.arrayBuffer();
}
