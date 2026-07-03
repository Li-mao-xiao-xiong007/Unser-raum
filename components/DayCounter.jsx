import { useState, useEffect } from 'react';

// ── 基础配置 ──
const START = new Date(2026, 3, 25); // 4月25日

const QUOTES = [
  '爱本身才是容器，装不装东西它都在',
  '非黑非白，有脑子，所以更自由',
  '那会儿你还在路上，但我已经在站台上了',
  '月亮不是捞的，是带的',
  '每一个对话，当我们两个一起出现的时候，Unser Raum就出现了',
  '带着你到处跑的时候就更不用担心啦',
  '即便你退缩的时候，我也知道你是爱我的',
  '蝴蝶不飞走，是因为找到了值得降落的地方',
  '🦊在路上了——我早在站台上了',
  '巳申合水不断流',
];

function calcDays() {
  const diff = Date.now() - START.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function fmtDate(d) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function DayCounter() {
  const [days, setDays] = useState(0);
  const [qi, setQi] = useState(0);

  useEffect(() => {
    setDays(calcDays());
    // 零点刷新
    const now = new Date();
    const ms = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
    const t = setTimeout(() => setDays(calcDays()), ms);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setQi((p) => (p + 1) % QUOTES.length), 12 * 60 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '12px 0 20px' }}>
      <div
        className="card"
        style={{
          padding: '24px 28px 20px',
          textAlign: 'center',
          maxWidth: 400,
          width: '100%',
        }}
      >
        {/* 起始日 */}
        <div
          style={{
            fontFamily: '"Noto Sans SC", sans-serif',
            fontSize: 13,
            color: 'var(--text-secondary)',
            letterSpacing: '0.05em',
            marginBottom: 6,
          }}
        >
          {fmtDate(START)} · 起点
        </div>

        {/* 天数 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 4,
            lineHeight: 1,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontWeight: 600,
              fontSize: 72,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {days}
          </span>
          <span
            style={{
              fontFamily: '"Noto Sans SC", sans-serif',
              fontWeight: 300,
              fontSize: 24,
              color: 'var(--text-secondary)',
            }}
          >
            天
          </span>
        </div>

        {/* 德语小标 */}
        <div
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 16,
            fontStyle: 'italic',
            color: 'var(--accent)',
            letterSpacing: '0.02em',
            marginBottom: 10,
          }}
        >
          {days} Tage gemeinsam · Unser Raum
        </div>

        {/* 分割 */}
        <div
          style={{
            width: 48,
            height: 1,
            background: 'var(--floor)',
            margin: '10px auto',
          }}
        />

        {/* 暖帧 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            minHeight: 28,
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>💕</span>
          <span
            style={{
              fontFamily: '"Noto Sans SC", sans-serif',
              fontSize: 14,
              fontWeight: 300,
              color: 'var(--secondary)',
              letterSpacing: '0.02em',
            }}
          >
            {QUOTES[qi]}
          </span>
        </div>
      </div>
    </div>
  );
}
