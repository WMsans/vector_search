from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from googleapiclient.errors import HttpError
from docx import Document
import io
from typing import List, Dict


class DriveService:
    def __init__(self, access_token: str, refresh_token: str = None):
        try:
            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
            )
            self.service = build('drive', 'v3', credentials=credentials)
        except Exception as e:
            raise Exception(f"Failed to initialize Drive service: {e}")

    def list_docx_files(self, max_results: int = 1000) -> List[Dict]:
        try:
            query = "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' and trashed=false"
            results = (
                self.service.files()
                .list(q=query, pageSize=max_results, fields="files(id, name)")
                .execute()
            )
            return results.get('files', [])
        except HttpError as e:
            raise Exception(f"Drive API error listing files: {e}")

    def download_and_extract_text(self, file_id: str) -> str:
        try:
            request = self.service.files().get_media(fileId=file_id)
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while not done:
                done = downloader.next_chunk()[1]

            fh.seek(0)
            doc = Document(fh)
            return ' '.join(para.text for para in doc.paragraphs).strip()
        except HttpError as e:
            raise Exception(f"Drive API error downloading file {file_id}: {e}")
        except Exception as e:
            raise Exception(f"Failed to extract text from file {file_id}: {e}")
