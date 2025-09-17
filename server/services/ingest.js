import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { vectorStore } from '../utils/retriever.js';

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_CHUNK_OVERLAP = 100;

async function extractTextFromFile(filePath, mimeType, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (mimeType === 'application/pdf' || ext === '.pdf') {
    const data = await pdf(buffer);
    return data.text || '';
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  // Fallback for text/markdown and others
  return buffer.toString('utf-8');
}

export async function ingestUploadedFile({ filePath, originalName, mimeType, chunkSize = DEFAULT_CHUNK_SIZE, chunkOverlap = DEFAULT_CHUNK_OVERLAP }) {
  const rawText = await extractTextFromFile(filePath, mimeType, originalName);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  const chunks = await splitter.splitText(rawText);

  const docs = chunks.map((content, index) =>
    new Document({
      pageContent: content,
      metadata: {
        file_name: originalName,
        source_type: path.extname(originalName || '').toLowerCase().replace('.', ''),
        chunk_index: index,
      },
    })
  );

  await vectorStore.addDocuments(docs);

  return {
    numChunks: docs.length,
    insertedIds: [],
  };
}

