import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import DayCounter from '../components/DayCounter';

// 房间色块映射（与 CSS 变量一致）
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

// grid 布局位置（参考 unser-raum.html）
const gridPositions = {
  kitchen:  { gridColumn: '1', gridRow: '1' },
  dining:   { gridColumn: '1', gridRow: '2' },
  entryway: { gridColumn: '1', gridRow: '3' },
  balcony:  { gridColumn: '2', gridRow: '1' },
  living:   { gridColumn: '2', gridRow: '2 / 4' },
  bedroom:  { gridColumn: '3', gridRow: '1' },
  bathroom: { gridColumn: '3', gridRow: '2' },
  study:    { gridColumn: '3', gridRow: '3' },
};

export default function Home() {
  const [rooms, setRooms] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getRooms(), api.getActivity(5)])
      .then(([roomsRes, actRes]) => {
        setRooms(roomsRes.data);
        setActivity(actRes.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <>
        <h1 className="main-title">Unser Raum</h1>
        <p className="sub-title">我们的空间 · Our Space</p>
        <DayCounter />
        <div style={{ display: 'grid', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="skeleton" style={{ height: '100px' }} />
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return <div className="empty-state">⚠️ 连接失败：{error}</div>;
  }

  return (
    <>
      <h1 className="main-title">Unser Raum</h1>
      <p className="sub-title">我们的空间 · Our Space</p>

      <DayCounter />

      {/* 房间网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '0.7fr 1fr 1fr',
        gridTemplateRows: 'auto auto auto',
        gap: '16px',
        maxWidth: '800px',
        margin: '0 auto',
        width: '100%',
      }}>
        {rooms?.map((room, idx) => {
          const colors = roomColors[room.key] || { bg: '#E8E0D8', light: '#D8CFC5' };
          const pos = gridPositions[room.key] || {};
          return (
            <Link
              key={room.key}
              href={`/rooms/${room.key}`}
              className="room-card-link fade-in-up"
              style={{
                gridColumn: pos.gridColumn,
                gridRow: pos.gridRow,
                minHeight: room.key === 'living' ? '240px' : '120px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.light} 100%)`,
                border: `2px solid ${colors.bg}`,
                opacity: 0.85,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '16px',
                textDecoration: 'none',
                transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                animationDelay: `${idx * 80}ms`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(74, 55, 40, 0.2)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
                e.currentTarget.style.opacity = '0.85';
              }}
            >
              <span style={{ fontSize: '1.1rem', fontWeight: 500, color: '#3D2E24' }}>
                {room.title}
              </span>
              <span style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: '0.8rem',
                fontStyle: 'italic',
                color: '#7A6B5E',
              }}>
                {room.title_en}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 最近活动 */}
      {activity.length > 0 && (
        <div style={{ marginTop: '48px', maxWidth: '800px', margin: '48px auto 0' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 500,
            color: '#4A3728',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            最近活动
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activity.map((a, i) => (
              <div key={i} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`author-badge ${a.author}`}>
                  {a.author === 'helle' ? '🌸 Helle' : '🦊 Kruger'}
                </span>
                <span style={{ flex: 1, fontSize: '0.875rem', color: '#3D2E24' }}>
                  {a.summary}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#B8AFA5' }}>
                  {new Date(a.created_at).toLocaleString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '32px 0', color: '#7A6B5E', fontSize: '0.875rem' }}>
        点击房间，探索属于我们的空间
      </footer>
    </>
  );
}
