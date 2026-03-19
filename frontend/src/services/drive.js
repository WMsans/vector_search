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

export async function listFiles(accessToken, extensions = ['docx'], maxResults = 1000) {
  const mimeTypes = [];
  const supportedMimes = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pdf: 'application/pdf',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
  };
  
  extensions.forEach(ext => {
    if (supportedMimes[ext]) {
      mimeTypes.push(supportedMimes[ext]);
    }
  });
  
  if (mimeTypes.length === 0) {
    return [];
  }
  
  const mimeQuery = mimeTypes.map(m => `mimeType='${m}'`).join(' or ');
  const query = `(${mimeQuery}) and trashed=false`;
  const fields = 'files(id,name,mimeType)';
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=${maxResults}`;
  const res = await fetchWithAuth(url, accessToken);
  const data = await res.json();
  return data.files || [];
}

export async function downloadFile(accessToken, fileId) {
  const url = `${DRIVE_API}/files/${fileId}?alt=media`;
  const res = await fetchWithAuth(url, accessToken);
  return res.arrayBuffer();
}
