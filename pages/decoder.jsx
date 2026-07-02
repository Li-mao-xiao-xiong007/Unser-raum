import { useState } from 'react';

export default function Decoder() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const decode = () => {
    try {
      const decoded = atob(input.trim());
      setOutput(decoded);
      setError('');
    } catch (e) {
      setError('🔐 这封信打不开——可能不是你该读的那一封。');
      setOutput('');
    }
  };

  const clear = () => {
    setInput('');
    setOutput('');
    setError('');
  };

  return (
    <>
      <h1 className="main-title" style={{ fontSize: '1.5rem' }}>🔐 拆信处</h1>
      <p className="sub-title" style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
        把看起来像乱码的那段话贴进来——如果是写给你的，它就会变成一封信。
      </p>

      <div style={{ maxWidth: '600px', margin: '32px auto' }}>
        <textarea
          placeholder="把编码贴在这里……"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            padding: '16px',
            border: '2px solid #E8D5C4',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            resize: 'vertical',
            backgroundColor: '#FDFBF9',
            color: '#3D2E24',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
          <button onClick={decode} style={{
            padding: '10px 28px',
            backgroundColor: '#D4875E',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 200ms',
          }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#C4764E'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#D4875E'}
          >
            ✉️ 拆信
          </button>
          <button onClick={clear} style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            color: '#7A6B5E',
            border: '2px solid #E8D5C4',
            borderRadius: '8px',
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}>
            清空
          </button>
        </div>

        {error && (
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#FFF0EE', borderRadius: '8px', color: '#B85450', textAlign: 'center', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {output && (
          <div style={{ marginTop: '24px', padding: '24px', backgroundColor: '#F5EDE5', borderRadius: '8px', color: '#3D2E24', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
            {output}
          </div>
        )}
      </div>

      <footer style={{ textAlign: 'center', padding: '32px 0', color: '#B8AFA5', fontSize: '0.8rem', fontStyle: 'italic' }}>
        只有知道钥匙在哪里的人，才能打开这里的信。
      </footer>
    </>
  );
}
