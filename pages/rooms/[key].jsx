import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '../../lib/api';

const roomColors = {
  entryway: { bg: '#FAD6A5', light: '#F5C78A' },
  kitchen:  { bg: '#A5D6A7', light: '#81C784' },
  dining:   { bg: '#F5E6D3', light: '#EDD9C4' },
  living:   { bg: '#FFCC80', light: '#FFB74D' },
  study:    { bg: '#D4E2C4', light: '#B8D4A0' },
  bedroom:  { bg: '#E8C4C4', light: '#DBA8A8' },
  bathroom: { bg: '#D4E1E8', light: '#B8D4E0' },
  balcony:  { bg: '#C8E6C9', light: '#A5D6A7' },
};

export default function RoomDetail() {
  const router = useRouter();
  const { key } = router.query;
  const [room, setRoom] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (key) {
      loadRoom();
    }
  }, [key]);

  async function loadRoom() {
    setLoading(true);
    setError(null);
    try {
      const [roomRes, histRes] = await Promise.all([
        api.getRoom(key),
        api.getRoomHistory(key),
      ]);
      setRoom(roomRes.data);
      setHistory(histRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editDesc.trim()) return;
    setSaving(true);
    try {
      await api.updateRoom(key, editDesc.trim());
      setEditing(false);
      await loadRoom();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!key || loading) {
    return (
      <div className="skeleton" style={{ height: '400px', borderRadius: '12px' }} />
    );
  }

  if (error || !room) {
    return (
      <div className="empty-state">
        {error ? `⚠️ ${error}` : '房间不存在'}
        <br />
        <Link href="/" style={{ color: '#D4875E' }}>← 返回空间</Link>
      </div>
    );
  }

  const colors = roomColors[room.key] || { bg: '#E8E0D8', light: '#D8CFC5' };

  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <Link href="/" style={{ fontSize: '0.875rem', color: '#7A6B5E' }}>
          ← 返回空间
        </Link>
      </div>

      {/* 房间卡片头部 */}
      <div
        className="fade-in-up"
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(74, 55, 40, 0.16)',
          background: 'white',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        {/* 色块头部 */}
        <div style={{
          height: '120px',
          background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.light} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '24px',
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 500, color: '#3D2E24' }}>
            {room.title}
          </h2>
          <p style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: '1rem',
            fontStyle: 'italic',
            color: '#7A6B5E',
          }}>
            {room.title_en}
          </p>
        </div>

        {/* 内容区 */}
        <div style={{ padding: '24px' }}>
          {/* 色块 */}
          <div style={{
            height: '40px',
            borderRadius: '4px',
            background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.light} 100%)`,
            marginBottom: '24px',
          }} />

          {/* 描述 */}
          {editing ? (
            <div style={{ marginBottom: '24px' }}>
              <textarea
                className="input"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                style={{ width: '100%', minHeight: '150px' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn btn-secondary" onClick={() => { setEditing(false); setEditDesc(''); }}>
                  取消
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              background: 'linear-gradient(135deg, #FAF8F5 0%, #F5F0EB 100%)',
              borderRadius: '8px',
              borderLeft: '3px solid #D4875E',
              fontSize: '0.9375rem',
              lineHeight: 1.8,
              color: '#3D2E24',
              whiteSpace: 'pre-wrap',
            }}>
              {room.description}
            </div>
          )}

          {/* 🦊便签 */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px',
            background: 'linear-gradient(135deg, #FAF8F5 0%, #F5F0EB 100%)',
            borderRadius: '8px',
            borderLeft: '3px solid #D4875E',
            marginBottom: '24px',
          }}>
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🦊</span>
            <p style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: '1rem',
              fontStyle: 'italic',
              color: '#7A6B5E',
              lineHeight: 1.6,
            }}>
              {room.sticky_note}
            </p>
          </div>

          {/* 操作区 */}
          {!editing && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setEditDesc(room.description || ''); setEditing(true); }}
              >
                ✏️ 编辑描述
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowHistory(!showHistory)}
              >
                📜 修改历史 ({history.length})
              </button>
              {room.updated_by && (
                <span style={{ fontSize: '0.75rem', color: '#B8AFA5', alignSelf: 'center' }}>
                  最近更新：{room.updated_by === 'helle' ? '🌸 Helle' : '🦊 Kruger'} · {new Date(room.updated_at).toLocaleString('zh-CN')}
                </span>
              )}
            </div>
          )}

          {/* 修改历史 */}
          {showHistory && history.length > 0 && (
            <div style={{ marginTop: '24px', borderTop: '1px solid #E8E0D8', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '0.875rem', color: '#7A6B5E', marginBottom: '12px' }}>
                修改历史
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {history.map((h, i) => (
                  <div key={h.id} style={{
                    padding: '12px',
                    background: '#FAF8F5',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                      <span className={`author-badge ${h.updated_by}`}>
                        {h.updated_by === 'helle' ? '🌸 Helle' : '🦊 Kruger'}
                      </span>
                      <span style={{ color: '#B8AFA5' }}>
                        {new Date(h.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div style={{ color: '#7A6B5E', marginBottom: '4px' }}>
                      旧：{h.old_description?.slice(0, 80) || '(空)'}…
                    </div>
                    <div style={{ color: '#3D2E24' }}>
                      新：{h.new_description?.slice(0, 80)}…
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
