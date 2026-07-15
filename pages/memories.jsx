import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const weightLabels = { 1: '轻', 2: '中', 3: '重', 4: '最重' };
const categories = ['基础层', '关系层', '动态层', '私密层', '温度层'];
const toneOptions = [
  { value: 'warm', label: '🌸 暖', desc: '温暖、感动、幸福' },
  { value: 'melancholy', label: '🌙 忧', desc: '忧郁、怀念、沉重' },
  { value: 'playful', label: '✨ 轻快', desc: '开心、有趣、搞怪' },
  { value: 'tender', label: '💕 柔', desc: '温柔、亲密、安静' },
  { value: 'neutral', label: '⚪ 中性', desc: '客观记录、无特别情绪' },
];

export default function Memories() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
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
    tone: 'neutral',
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
        tone: memory.tone || 'neutral',
      });
    } else {
      setEditingId(null);
      setForm({ title: '', content: '', weight: 2, category: '', tags: '', source: '', tone: 'neutral' });
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
        tone: form.tone || null,
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

      {/* 表单弹层（仅新增） */}
      {showForm && !editingId && (
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
              <select
                className="input"
                value={form.tone}
                onChange={(e) => setForm({ ...form, tone: e.target.value })}
                title="情感温度"
              >
                {toneOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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
        <div className="memory-card-list">
          {memories.map((m) => {
            const isExpanded = expandedId === m.id;
            const isEditing = editingId === m.id;
            const contentLong = (m.content || '').length > 200;
            const preview = contentLong ? m.content.slice(0, 200) + '...' : (m.content || '');

            return (
              <div
                key={m.id}
                className={`memory-card fade-in-up${isExpanded ? ' expanded' : ''}${m.is_pinned ? ' pinned' : ''}`}
              >
                {/* 卡片头部：标题行 */}
                <div
                  className="memory-card-header"
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : m.id); }}}
                >
                  <div className="memory-card-title-row">
                    {m.is_pinned && <span className="memory-pin">📌</span>}
                    <strong className="memory-card-title">{m.title}</strong>
                    <span className={`author-badge ${m.author}`}>
                      {m.author === 'helle' ? '🌸 Helle' : '🦊 Kruger'}
                    </span>
                  </div>
                  <div className="memory-card-meta">
                    {m.tone && <span className={`memory-tone-tag tone-${m.tone}`}>{toneOptions.find(t => t.value === m.tone)?.label || m.tone}</span>}
                    {m.category && <span className="tag">{m.category}</span>}
                    {m.weight && <span className="tag">⚖️ {weightLabels[m.weight]}</span>}
                    <span className="memory-card-date">
                      {new Date(m.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`memory-expand-icon${isExpanded ? ' open' : ''}`}>▸</span>
                  </div>
                </div>

                {/* 标签行：折叠时也显示 */}
                {m.tags?.length > 0 && (
                  <div className="memory-card-tags">
                    {m.tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
                  </div>
                )}

                {/* 展开内容 */}
                <div className={`memory-card-body${isExpanded || isEditing ? ' open' : ''}`}>
                  <div className="memory-card-content">
                    {isEditing ? (
                      /* 编辑表单 */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input
                          className="input"
                          placeholder="标题"
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                        />
                        <textarea
                          className="input"
                          placeholder="内容（支持 Markdown）"
                          value={form.content}
                          onChange={(e) => setForm({ ...form, content: e.target.value })}
                          style={{ minHeight: '120px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <select className="input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })}>
                            {Object.entries(weightLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ minWidth: '100px' }}>
                            <option value="">选择分类</option>
                            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <select className="input" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} title="情感温度">
                            {toneOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <input className="input" placeholder="标签（逗号分隔）" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} style={{ flex: 1, minWidth: '120px' }} />
                          <input className="input" placeholder="来源" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={{ flex: 1, minWidth: '100px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); setEditingId(null); setShowForm(false); }}>取消</button>
                          <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); handleSubmit(); }}>保存</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          fontSize: '0.9375rem',
                          color: '#3D2E24',
                          lineHeight: 1.8,
                          whiteSpace: 'pre-wrap',
                          marginBottom: '12px',
                        }}>
                          {m.content}
                        </div>
                        {m.source && (
                          <div className="memory-card-source">来源：{m.source}</div>
                        )}
                      </>
                    )}

                    <div className="memory-card-actions">
                      <span style={{ fontSize: '0.75rem', color: '#B8AFA5' }}>
                        {new Date(m.created_at).toLocaleString('zh-CN')}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isEditing) {
                              setEditingId(null);
                              setShowForm(false);
                            } else {
                              openForm(m);
                              setExpandedId(m.id);
                            }
                          }}
                        >
                          {isEditing ? '取消编辑' : '编辑'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}>
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 折叠时的预览 */}
                {!isExpanded && contentLong && (
                  <div className="memory-card-preview" onClick={() => setExpandedId(m.id)}>
                    {preview}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
