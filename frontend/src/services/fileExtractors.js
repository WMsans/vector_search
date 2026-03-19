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
  const ds = new DecompressionStream('gzip');
  const decompressedStream = new Response(arrayBuffer).body.pipeThrough(ds);
  const decompressed = await decompressedStream.arrayBuffer();
  
  const textDecoder = new TextDecoder();
  const text = textDecoder.decode(decompressed);
  
  const slideTexts = text.match(/<a:t>([^<]*)<\/a:t>/g) || [];
  return slideTexts.map(t => t.replace(/<\/?a:t>/g, '')).join(' ');
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
  return extractor.extract(arrayBuffer);
}
