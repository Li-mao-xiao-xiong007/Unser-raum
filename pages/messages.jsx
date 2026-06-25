import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      setLoading(true);
      const res = await api.getMessages(1, 50);
      setMessages(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePost() {
    if (!newContent.trim()) return;
    setPosting(true);
    try {
      await api.postMessage(newContent.trim());
      setNewContent('');
      await loadMessages();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('确定删除这条留言吗？')) return;
    try {
      await api.deleteMessage(id);
      await loadMessages();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <>
        <h1 className="main-title" style={{ fontSize: '2rem' }}>💬 留言板</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="skeleton" style={{ height: '60px' }} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="main-title" style={{ fontSize: '2rem' }}>💬 留言板</h1>
      <p className="sub-title" style={{ marginBottom: '24px' }}>我们之间的悄悄话</p>

      {error && (
        <div style={{ textAlign: 'center', color: '#C0392B', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 发布留言 */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <textarea
          className="input"
          placeholder="写点什么……"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          style={{ width: '100%', minHeight: '60px' }}
        />
        <div style={{ marginTop: '12px', textAlign: 'right' }}>
          <button
            className="btn btn-primary"
            onClick={handlePost}
            disabled={posting || !newContent.trim()}
          >
            {posting ? '发送中…' : '🌸 发布'}
          </button>
        </div>
      </div>

      {/* 留言列表 */}
      {messages.length === 0 ? (
        <div className="empty-state">
          还没有留言——要不要写第一条？
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((m) => (
            <div
              key={m.id}
              className="card fade-in-up"
              style={{
                padding: '16px 20px',
                borderLeft: `3px solid ${m.author === 'helle' ? '#E8A87C' : '#7DA87B'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className={`author-badge ${m.author}`}>
                  {m.author === 'helle' ? '🌸 Helle' : '🦊 Kruger'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#B8AFA5' }}>
                  {new Date(m.created_at).toLocaleString('zh-CN')}
                </span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9375rem', color: '#3D2E24' }}>
                {m.content}
              </div>
              <div style={{ marginTop: '8px', textAlign: 'right' }}>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(m.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
