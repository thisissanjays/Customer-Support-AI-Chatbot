import React, { useState } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

export default function App() {
  const [file, setFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return
    setUploadStatus('Uploading...')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await axios.post(`${API_BASE}/api/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadStatus(`Ingested ${res.data.chunks} chunks`)
    } catch (err) {
      setUploadStatus('Upload failed')
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const next = [...messages, { role: 'user', content: input }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await axios.post(`${API_BASE}/chat`, {
        message: input,
        history: next,
      })
      setMessages([...next, { role: 'assistant', content: res.data.response }])
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: 'Error getting response' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0f17',
      color: '#e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px'
    }}>
      <h1>GenAI Support Chat (MVP)</h1>

      <form onSubmit={handleUpload} style={{ marginTop: 16 }}>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="submit" style={{ marginLeft: 8 }}>Upload & Ingest</button>
      </form>
      <div style={{ marginTop: 8, minHeight: 24 }}>{uploadStatus}</div>

      <div style={{
        width: '100%',
        maxWidth: 800,
        marginTop: 24,
        border: '1px solid #1f2937',
        borderRadius: 8,
        padding: 16,
        background: '#0f172a'
      }}>
        <div style={{ minHeight: 320 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <strong>{m.role === 'user' ? 'You' : 'Assistant'}:</strong> {m.content}
            </div>
          ))}
          {loading && <div>Thinking…</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your docs"
            style={{ flex: 1 }}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  )
}


