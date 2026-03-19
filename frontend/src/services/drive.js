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

export async function listDocxFiles(accessToken, maxResults = 1000) {
  const query = "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' and trashed=false";
  const fields = 'files(id,name)';
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
