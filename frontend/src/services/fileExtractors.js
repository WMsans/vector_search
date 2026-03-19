import JSZip from 'jszip';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

async function extractTxt(arrayBuffer) {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(arrayBuffer);
}

async function extractDocx(arrayBuffer) {
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value;
}

async function extractPdf(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    textParts.push(pageText);
  }
  return textParts.join('\n');
}

async function extractPptx(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const slideFiles = Object.keys(zip.files)
    .filter(name => name.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });
  
  const textParts = [];
  for (const slideFile of slideFiles) {
    const content = await zip.file(slideFile).async('text');
    const matches = content.match(/<a:t>([^<]*)<\/a:t>/g) || [];
    textParts.push(...matches.map(t => t.replace(/<\/?a:t>/g, '')));
  }
  return textParts.join(' ');
}

const EXTRACTORS = {
  docx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extract: extractDocx,
  },
  pdf: {
    mimeType: 'application/pdf',
    extract: extractPdf,
  },
  pptx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extract: extractPptx,
  },
  txt: {
    mimeType: 'text/plain',
    extract: extractTxt,
  },
};

export function getSupportedExtensions() {
  return Object.keys(EXTRACTORS);
}

export function getMimeTypes(extensions) {
  return extensions
    .filter(ext => EXTRACTORS[ext])
    .map(ext => EXTRACTORS[ext].mimeType);
}

export async function extractText(arrayBuffer, filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const extractor = EXTRACTORS[ext];
  if (!extractor) {
    return '';
  }
  try {
    return await extractor.extract(arrayBuffer);
  } catch {
    return '';
  }
}
