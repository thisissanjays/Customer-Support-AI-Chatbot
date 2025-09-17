# 🤖 GenAI Chat Support Agent

An AI-powered chat support agent that ingests documents and answers questions using RAG (Retrieval-Augmented Generation). Built with Node.js/Express backend and React frontend.

## ✨ Features

- **Document Upload & Processing**: Support for PDF, DOCX, TXT, and MD files (up to 20MB)
- **AI-Powered Chat**: Intelligent responses based on uploaded documents using OpenAI GPT-4o-mini
- **Vector Search**: OpenAI embeddings with Supabase vector storage for semantic search
- **Real-time Chat Interface**: Modern React UI with dark theme
- **Document Chunking**: Automatic text splitting and processing for optimal retrieval
- **Conversation Memory**: Maintains chat history for contextual responses

## 🏗️ Architecture

```
GenAiChatBot/
├── server/                 # Node.js/Express backend
│   ├── services/          # Business logic (document ingestion)
│   ├── utils/             # Utilities (retriever, formatters)
│   ├── uploads/           # Temporary file storage
│   └── index.js           # Main server file
├── client/                # React frontend
│   ├── src/               # React components
│   └── public/            # Static assets
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key
- Supabase account

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/GenAiChatBot.git
cd GenAiChatBot
```

### 2. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Environment Setup

Create `server/.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3000
```

### 4. Supabase Database Setup

Run this SQL in your Supabase SQL editor:

```sql
-- Enable pgvector extension
create extension if not exists vector;

-- Create documents table
create table if not exists documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(1536)
);

-- Create index for vector similarity search
create index if not exists documents_embedding_idx
on documents using ivfflat (embedding vector_cosine_ops);

-- Create similarity search function
create or replace function match_documents(
  query_embedding vector(1536),
  match_count int default 5,
  filter jsonb default '{}'::jsonb
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
) language sql stable as $$
  select
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  order by d.embedding <=> query_embedding
  limit match_count;
$$;
```

### 5. Run the Application

```bash
# Start the backend server (from server directory)
cd server
npm run dev

# Start the frontend (from client directory, in a new terminal)
cd client
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 📖 How to Use

### 1. Upload Documents
- Click "Choose File" and select a PDF, DOCX, TXT, or MD file
- Click "Upload & Ingest" to process the document
- Wait for "Ingested X chunks" confirmation

### 2. Chat with Your Documents
- Type questions in the chat input
- The AI will answer based on your uploaded documents
- Ask follow-up questions for more details

### 3. Example Questions
- "What is the main topic of the document?"
- "Summarize the key points"
- "What are the technical requirements mentioned?"
- "Who is the author and what are their qualifications?"

## 🔧 API Endpoints

### Backend API

- `GET /health` - Health check
- `POST /api/upload` - Upload and process documents
- `POST /chat` - Chat with the AI agent

### Upload Request
```javascript
// FormData with file
const formData = new FormData();
formData.append('file', file);
```

### Chat Request
```javascript
// POST /chat
{
  "message": "Your question here",
  "history": [
    {"role": "user", "content": "Previous question"},
    {"role": "assistant", "content": "Previous answer"}
  ]
}
```

## 🛠️ Configuration

### Document Processing
- **Chunk Size**: 500 characters (configurable in `server/services/ingest.js`)
- **Chunk Overlap**: 100 characters
- **File Size Limit**: 20MB
- **Supported Formats**: PDF, DOCX, TXT, MD

### AI Model Settings
- **Chat Model**: GPT-4o-mini (configurable in `server/index.js`)
- **Embedding Model**: text-embedding-3-small (1536 dimensions)
- **Temperature**: 0.3 (for consistent responses)
- **Retrieval Count**: 6 documents per query

## 🔍 Troubleshooting

### Common Issues

1. **"supabaseUrl is required" Error**
   - Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `.env`
   - Check that the Supabase project is active

2. **"Error getting response" in Chat**
   - Verify OpenAI API key is valid and has credits
   - Check server logs for detailed error messages
   - Ensure documents are uploaded successfully

3. **Upload Fails**
   - Check file size (must be ≤ 20MB)
   - Verify file format is supported
   - Ensure server has write permissions to `uploads/` directory

4. **No Relevant Answers**
   - Try rephrasing your question
   - Upload more relevant documents
   - Check if the document was processed correctly

### Debug Mode

Enable debug logging by checking server console for:
- `[chat] user question:` - Original user input
- `[chat] standalone question:` - Rewritten question
- `[chat] retrieved docs:` - Number of documents found
- `[chat] combined context chars:` - Context length

## 🚧 Development

### Project Structure

```
server/
├── index.js              # Main Express server
├── services/
│   └── ingest.js         # Document processing pipeline
├── utils/
│   ├── retriever.js      # Vector store and retrieval
│   ├── combineDocuments.js # Document combination
│   └── formatConvHistory.js # Chat history formatting
└── uploads/              # Temporary file storage

client/
├── src/
│   ├── App.jsx           # Main React component
│   └── main.jsx          # React entry point
└── index.html            # HTML template
```

### Adding New Features

1. **New File Formats**: Extend `extractTextFromFile()` in `server/services/ingest.js`
2. **Custom Chunking**: Modify `RecursiveCharacterTextSplitter` settings
3. **UI Improvements**: Update React components in `client/src/`
4. **API Endpoints**: Add new routes in `server/index.js`

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review the server logs for error details
3. Open an issue on GitHub with:
   - Description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Server logs (if applicable)

## 🔮 Roadmap

- [ ] Multi-tenant support with user authentication
- [ ] Advanced document management dashboard
- [ ] Streaming responses for better UX
- [ ] Document categorization and tagging
- [ ] Analytics and usage insights
- [ ] Embeddable chat widget
- [ ] API rate limiting and security
- [ ] Docker deployment support

---

**Built with ❤️ using Node.js, React, OpenAI, and Supabase**
