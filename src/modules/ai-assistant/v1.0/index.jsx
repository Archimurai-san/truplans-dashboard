import { useState, useRef, useEffect } from 'react';
import { API_BASE, S } from '../../../shared/core.jsx';

const QUICK_PROMPTS = [
  'What are the setbacks for Low Density Residential in Irvine?',
  'What are the development standards for RM-1-1 in San Diego?',
  'What phase should a project be in after site measurement?',
  'What documents are needed for a city submittal?',
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 9,
        color: 'var(--text-faint)',
        fontFamily: 'monospace',
        marginBottom: 4,
        letterSpacing: '1px',
      }}>
        {isUser ? 'YOU' : 'TRUPLANS AI'}
      </div>
      <div style={{
        maxWidth: '80%',
        background: isUser ? 'var(--accent)' : 'var(--bg-secondary)',
        color: isUser ? '#fff' : 'var(--text-body)',
        border: `1px solid ${isUser ? 'var(--accent)' : 'var(--border-primary)'}`,
        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        padding: '10px 14px',
        fontSize: 12,
        lineHeight: 1.65,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  );
}

export function AiAssistant({ projects = [], activeProjectId = null, messages, setMessages }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjectId || '');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (activeProjectId) setSelectedProjectId(activeProjectId);
  }, [activeProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  const ask = async (question) => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, project: selectedProject || undefined }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch(err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '2px', fontFamily: 'monospace', fontWeight: 700 }}>TRUPLANS AI</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-bright)' }}>AI Assistant</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Zoning · Workflow · Projects</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>Project context:</div>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            style={{ ...S.sel, fontSize: 11, minWidth: 200 }}
          >
            <option value=''>None — General question</option>
            {projects.filter(p => p.status !== 'Completed').map(p => (
              <option key={p.id} value={p.id}>{p.id} · {p.name} ({p.city})</option>
            ))}
          </select>
          {messages.length > 1 && (
            <button
              onClick={() => setMessages([messages[0]])}
              style={{ ...S.ghost, fontSize: 10, padding: '4px 10px' }}
            >Clear</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        borderRadius: 8,
        padding: '16px 20px',
        marginBottom: 12,
      }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: 'var(--text-faint)', fontFamily: 'monospace', marginTop: 2 }}>TRUPLANS AI</div>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px 12px 12px 2px', padding: '10px 14px' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--accent)',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    opacity: 0.6,
                  }}/>
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick prompts */}
      {messages.length === 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, flexShrink: 0 }}>
          {QUICK_PROMPTS.map((q, i) => (
            <button key={i} onClick={() => ask(q)} style={{
              background: 'none',
              border: '1px solid var(--border-secondary)',
              color: 'var(--text-muted)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 10,
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}>{q}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder='Ask anything — zoning, setbacks, workflow, project status...'
          disabled={loading}
          rows={2}
          style={{
            ...S.input,
            flex: 1,
            resize: 'none',
            fontSize: 12,
            fontFamily: 'inherit',
            lineHeight: 1.5,
          }}
        />
        <button
          onClick={() => ask(input)}
          disabled={loading || !input.trim()}
          style={{
            ...S.btn,
            padding: '0 20px',
            opacity: loading || !input.trim() ? 0.5 : 1,
            cursor: loading || !input.trim() ? 'default' : 'pointer',
            alignSelf: 'stretch',
          }}
        >{loading ? '...' : 'Ask'}</button>
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-faint)', fontFamily: 'monospace', marginTop: 6, textAlign: 'center' }}>
        Enter to send · Shift+Enter for new line · Powered by Claude Haiku
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
    </div>
  );
}
