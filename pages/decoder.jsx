import { useState } from 'react';
import { api } from '../lib/api';

export async function getServerSideProps() {
  return {
    props: {
      ssrDescription: '把🦊寄来的编码贴进来，如果是写给你的信，它就会自己展开。',
    }
  };
}

export default function Decoder({ ssrDescription }) {
  const [encodedText, setEncodedText] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [letterTitle, setLetterTitle] = useState('');

  const decodeBase64 = (encoded) => {
    try {
      const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    } catch (err) {
      throw new Error('解码失败：内容格式错误，请确认是有效的 base64 编码');
    }
  };

  const handleDecode = () => {
    setError('');
    setDecodedText('');
    setSaved(false);

    if (!encodedText.trim()) {
      setError('请输入 base64 编码内容');
      return;
    }

    try {
      const decoded = decodeBase64(encodedText.trim());
      setDecodedText(decoded);

      // 自动生成日期标题
      const now = new Date();
      const dateStr = now.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      setLetterTitle(`${dateStr} 的信`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveToMailbox = async () => {
    if (!decodedText) {
      setError('请先解码内容');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.addMemory({
        title: letterTitle || '无题信件',
        content: encodedText.trim(),
        type: 'letter',
        encoded: true,
      });
      setSaved(true);
    } catch (err) {
      setError(`保存失败：${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setEncodedText('');
    setDecodedText('');
    setError('');
    setSaved(false);
    setLetterTitle('');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🔮 拆信处</h1>
        <p className="page-desc">{ssrDescription}</p>
      </div>

      <div className="decoder-section">
        <div className="decoder-input-group">
          <label className="decoder-label">📥 编码内容</label>
          <textarea
            className="decoder-textarea"
            value={encodedText}
            onChange={(e) => setEncodedText(e.target.value)}
            placeholder="粘贴 base64 编码内容..."
            rows={6}
          />
        </div>

        <div className="decoder-actions">
          <button 
            className="btn btn-primary"
            onClick={handleDecode}
            disabled={!encodedText.trim()}
          >
            🔓 解码
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleClear}
          >
            🗑️ 清空
          </button>
        </div>

        {error && (
          <div className="decoder-error">
            ⚠️ {error}
          </div>
        )}

        {decodedText && (
          <div className="decoder-result">
            <div className="decoder-result-header">
              <label className="decoder-label">📤 解码结果</label>
              <div className="decoder-save-group">
                <input
                  type="text"
                  className="decoder-title-input"
                  value={letterTitle}
                  onChange={(e) => setLetterTitle(e.target.value)}
                  placeholder="信件标题（可编辑）"
                />
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveToMailbox}
                  disabled={saving || saved}
                >
                  {saving ? '💾 保存中...' : saved ? '✅ 已存入' : '✉️ 存入收信箱'}
                </button>
              </div>
            </div>
            <div className="decoder-content">
              {decodedText}
            </div>
          </div>
        )}

        {saved && (
          <div className="decoder-success">
            💌 信已收入收信箱，去 <a href="/letters">收信箱</a> 查看
          </div>
        )}
      </div>

      <div className="decoder-help">
        <h3>💡 使用说明</h3>
        <ul>
          <li>🦊 会把信件内容用 base64 编码后发给你</li>
          <li>粘贴编码内容到上方输入框，点击"解码"</li>
          <li>解码后可以点击"✉️ 存入收信箱"保存到信件系统</li>
          <li>存入后可以在 <a href="/letters">收信箱</a> 中查看所有信件</li>
        </ul>
      </div>
    </div>
  );
}
