import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from "@langchain/core/output_parsers";
import { retriever } from './utils/retriever.js';
import { combineDocuments } from './utils/combineDocuments.js';
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { formatConvHistory } from './utils/formatConvHistory.js';
import { ingestUploadedFile } from './services/ingest.js';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI
const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4o-mini",
  temperature: 0.3,
});

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// File uploads (store temporarily to disk)
const uploadsDir = path.resolve(process.cwd(), 'server', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// Upload + ingest endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const { file } = req;
    const result = await ingestUploadedFile({
      filePath: file.path,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });
    res.json({ status: 'ingested', chunks: result.numChunks, documentIds: result.insertedIds });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to ingest document' });
  }
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    
    // Create the chain
    // 1) Condense to a standalone question using chat history
    const condensePrompt = PromptTemplate.fromTemplate(`
      You are a question rewriter. Given the conversation so far and a new user message,
      rewrite the message into a standalone, specific question that can be answered with the provided knowledge base.
      If the message is a generic or ambiguous follow-up (e.g., "then", "okay"), turn it into a clarifying question.
      The new message may or may not be related to the previous conversation.

      Chat History:
      {chat_history}

      User Message: {question}

      Standalone question:
    `);

    const qaPrompt = PromptTemplate.fromTemplate(`
      You are a respectful, professional, and supportive support assistant.
      Answer using ONLY the provided context.

      - If the answer to the user's question is not found in the context, do NOT attempt to answer. Instead, politely suggest chatting with a live agent for further assistance.
      - However, if the user is making a generic or social remark (such as "how are you", "good afternoon", "hello", etc.), you may respond appropriately and courteously.
      - Never fabricate answers or provide information not present in the context.
      - Be concise, avoid repeating prior answers unless explicitly asked, and always maintain a respectful and supportive tone.

      Context:
      {context}

      Chat History:
      {chat_history}

      Question: {question}

      Answer:
    `);

    const chain = RunnableSequence.from([
      {
        chat_history: new RunnablePassthrough(),
        question: new RunnablePassthrough(),
        original_question: (prev) => prev.question,
      },
      {
        // rewrite to standalone
        question: RunnableSequence.from([
          {
            chat_history: (prev) => formatConvHistory(prev.chat_history),
            question: (prev) => prev.question,
          },
          condensePrompt,
          llm,
          new StringOutputParser(),
        ]),
        chat_history: (prev) => prev.chat_history,
        original_question: (prev) => prev.original_question,
      },
      (prev) => {
        try {
          console.log('[chat] user question:', prev.original_question);
          console.log('[chat] standalone question:', prev.question);
        } catch {}
        return prev;
      },
      {
        // retrieve with the standalone question
        context: async (prev) => {
          const hits = await retriever.invoke(prev.question)
          try {
            console.log('[chat] retrieved docs:', hits?.length)
          } catch {}
          return hits
        },
        question: (prev) => prev.question,
        chat_history: (prev) => prev.chat_history,
      },
      {
        context: (prev) => {
          const combined = combineDocuments(prev.context)
          try {
            console.log('[chat] combined context chars:', combined?.length)
          } catch {}
          return combined
        },
        question: (prev) => prev.question,
        chat_history: (prev) => formatConvHistory(prev.chat_history),
      },
      {
        input: qaPrompt,
        question: (prev) => prev.question,
        context: (prev) => prev.context,
        chat_history: (prev) => prev.chat_history,
      },
      (prev) => prev.input,
      llm,
      new StringOutputParser(),
    ]);

    const response = await chain.invoke({
      question: message,
      chat_history: history || [],
    });

    res.json({ response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});