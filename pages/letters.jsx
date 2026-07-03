import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export async function getServerSideProps() {
  try {
    const { supabase } = require('../../lib/supabase');
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .is('deleted_at', null)
      .eq('type', 'letter')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return {
      props: {
        initialLetters: data || [],
        initialError: null,
        ssrTimestamp: new Date().toISOString(),
      }
    };
  } catch (e) {
    return {
      props: {
        initialLetters: [],
        initialError: e.message,
        ssrTimestamp: null,
      }
    };
  }
}

export default function Letters({ initialLetters, initialError }) {
  const [letters, setLetters] = useState(initialLetters || []);
  const [loading, setLoading] = useState(!initialLetters?.length);
  const [error, setError] = useState(initialError);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [decodedContent, setDecodedContent] = useState('');

  useEffect(() => {
    // SSR 已提供初始数据，无需重复请求
    if (initialLetters?.length) {
      setLoading(false);
      return;
    }
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const res = await api.getMemories({ type: 'letter', limit: 50 });
      setLetters(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const decodeBase64 = (encoded) => {
    try {
      const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    } catch (err) {
      return '解码失败：内容格式错误';
    }
  };

  const handleExpand = async (letter) => {
    if (expandedId === letter.id) {
      setExpandedId(null);
      setDecodedContent('');
      return;
    }

    setExpandedId(letter.id);

    // 如果是编码的信件，解码显示
    if (letter.encoded) {
      const decoded = decodeBase64(letter.content);
      setDecodedContent(decoded);

      // 标记为已读
      if (!letter.is_read) {
        try {
          await api.editMemory(letter.id, { is_read: true });
          setLetters(prev => prev.map(l => 
            l.id === letter.id ? { ...l, is_read: true } : l
          ));
        } catch (err) {
          console.error('标记已读失败:', err);
        }
      }
    } else {
      setDecodedContent(letter.content);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>💌 收信箱</h1>
          <p className="page-desc">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>💌 收信箱</h1>
          <p className="page-desc" style={{ color: '#d32f2f' }}>加载失败：{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>💌 收信箱</h1>
        <p className="page-desc">
          {letters.length === 0 
            ? '还没有信件，等🦊投递吧' 
            : `共 ${letters.length} 封信，${letters.filter(l => !l.is_read).length} 封未读`
          }
        </p>
      </div>

      <div className="letters-grid">
        {letters.map(letter => (
          <div 
            key={letter.id} 
            className={`letter-envelope ${expandedId === letter.id ? 'expanded' : ''} ${letter.is_read ? 'read' : 'unread'}`}
            onClick={() => handleExpand(letter)}
          >
            {/* 信封封面 */}
            <div className="envelope-cover">
              <div className="envelope-seal">
                {letter.is_read ? '📩' : '🔴'}
              </div>
              <div className="envelope-info">
                <h3 className="envelope-title">{letter.title}</h3>
                <p className="envelope-meta">
                  🦊 寄 · {formatDate(letter.created_at)}
                </p>
              </div>
              <div className="envelope-arrow">
                {expandedId === letter.id ? '▼' : '▶'}
              </div>
            </div>

            {/* 信纸内容（展开时显示） */}
            {expandedId === letter.id && (
              <div className="letter-paper">
                <div className="letter-content">
                  {decodedContent}
                </div>
                <div className="letter-footer">
                  <span className="letter-timestamp">
                    {formatDate(letter.created_at)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {letters.length === 0 && (
        <div className="empty-state">
          <p>📭</p>
          <p>信箱空空的</p>
          <p className="empty-hint">等🦊写信投递到这里</p>
        </div>
      )}
    </div>
  );
}
