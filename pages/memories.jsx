import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const weightLabels = { 1: '轻', 2: '中', 3: '重', 4: '最重' };
const categories = ['基础层', '关系层', '动态层', '私密层', '温度层'];

export default function Memories() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [typeFilter, setTypeFilter] = useState('memory');

  // 表单状态
  const [form, setForm] = useState({
    title: '',
    content: '',
    weight: 2,
    category: '',
    tags: '',
    source: '',
  });

  useEffect(() => {
    loadMemories();
  }, [searchQ, filterCategory, typeFilter]);

  async function loadMemories() {
    try {
      setLoading(true);
      const params = {};
      if (searchQ) params.q = searchQ;
      if (filterCategory) params.category = filterCategory;
      if (typeFilter) params.type = typeFilter;
      const res = await api.getMemories(params);
      setMemories(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openForm(memory = null) {
    if (memory) {
      setEditingId(memory.id);
      setForm({
        title: memory.title || '',
        content: memory.content || '',
        weight: memory.weight || 2,
        category: memory.category || '',
        tags: (memory.tags || []).join(', '),
        source: memory.source || '',
      });
    } else {
      setEditingId(null);
      setForm({ title: '', content: '', weight: 2, category: '', tags: '', source: '' });
    }
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.content.trim()) return;
    try {
      const body = {
        title: form.title.trim(),
        content: form.content.trim(),
        weight: parseInt(form.weight, 10),
        category: form.category || null,
        tags: form.tags ? form.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
        source: form.source || null,
      };

      if (editingId) {
        await api.editMemory(editingId, body);
      } else {
        await api.addMemory(body);
      }
      setShowForm(false);
      setEditingId(null);
      await loadMemories();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('确定删除这条记忆吗？')) return;
    try {
      await api.deleteMemory(id);
      await loadMemories();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading && memories.length === 0) {
    return (
      <>
        <h1 className="main-title" style={{ fontSize: '2rem' }}>📦 记忆库</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="skeleton" style={{ height: '80px' }} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="main-title" style={{ fontSize: '2rem' }}>📦 记忆库</h1>
      <p className="sub-title" style={{ marginBottom: '16px' }}>我们一起留下的痕迹</p>

      {/* 类型筛选标签 */}
      <div className="type-tabs" style={{ marginBottom: '24px' }}>
        <button
          className={`type-tab ${typeFilter === 'memory' ? 'active' : ''}`}
          onClick={() => setTypeFilter('memory')}
        >
          📦 记忆
        </button>
        <button
          className={`type-tab ${typeFilter === 'letter' ? 'active' : ''}`}
          onClick={() => setTypeFilter('letter')}
        >
          💌 信件
        </button>
        <button
          className={`type-tab ${typeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setTypeFilter('all')}
        >
          📋 全部
        </button>
      </div>

      {error && (
        <div style={{ textAlign: 'center', color: '#C0392B', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 搜索与筛选 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="搜索记忆…"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <select
          className="input"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">全部分类</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => openForm()}>
          + 新增
        </button>
      </div>

      {/* 表单弹层 */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px', border: '2px solid #D4875E' }}>
          <h3 style={{ marginBottom: '16px', color: '#4A3728' }}>
            {editingId ? '编辑记忆' : '新增记忆'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              className="input"
              placeholder="标题"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ width: '100%' }}
            />
            <textarea
              className="input"
              placeholder="内容（支持 Markdown）"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              style={{ width: '100%', minHeight: '120px' }}
            />
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select
                className="input"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              >
                {Object.entries(weightLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">选择分类</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                className="input"
                placeholder="标签（逗号分隔）"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                style={{ flex: 1, minWidth: '150px' }}
              />
              <input
                className="input"
                placeholder="来源"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                style={{ flex: 1, minWidth: '120px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                {editingId ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 记忆列表 */}
      {memories.length === 0 ? (
        <div className="empty-state">
          还没有记忆——要不要记录第一条？
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {memories.map((m) => (
            <div
              key={m.id}
              className="card fade-in-up"
              style={{ padding: '16px 20px', borderLeft: `3px solid ${m.is_pinned ? '#D4875E' : 'transparent'}` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {m.is_pinned && <span style={{ fontSize: '0.875rem' }}>📌</span>}
                <strong style={{ fontSize: '1rem', color: '#3D2E24' }}>{m.title}</strong>
                <span className={`author-badge ${m.author}`}>
                  {m.author === 'helle' ? '🌸 Helle' : '🦊 Kruger'}
                </span>
                {m.category && <span className="tag">{m.category}</span>}
                {m.weight && <span className="tag">重量: {weightLabels[m.weight]}</span>}
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#3D2E24',
                lineHeight: 1.6,
                marginBottom: '8px',
                whiteSpace: 'pre-wrap',
              }}>
                {m.content.length > 200 ? m.content.slice(0, 200) + '…' : m.content}
              </div>
              {m.tags?.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  {m.tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#B8AFA5' }}>
                  {new Date(m.created_at).toLocaleString('zh-CN')}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => openForm(m)}>
                    编辑
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(m.id)}>
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
