import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    system_prompt: '',
    temperature: '1.0',
    max_tokens: '4096',
    model: 'deepseek-chat',
    memory_count: '5',
    llm_api_key: '',
    llm_base_url: 'https://api.deepseek.com',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const isSendingRef = useRef(false); // 防止发送期间 loadMessages 覆盖临时消息

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 加载会话列表
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat');
      const json = await res.json();
      setConversations(json.data || []);
    } catch (err) {
      console.error('加载会话列表失败:', err);
    }
  }, []);

  // 加载会话消息
  const loadMessages = useCallback(async (convId) => {
    if (!convId || isSendingRef.current) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/chat/${convId}`);
      const json = await res.json();
      setMessages(json.data?.messages || []);
    } catch (err) {
      console.error('加载消息失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载设置
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/settings');
      const json = await res.json();
      if (json.data) {
        setSettings(prev => ({ ...prev, ...json.data }));
      }
    } catch (err) {
      console.error('加载设置失败:', err);
    }
  }, []);

  // 保存设置
  const saveSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      await fetch('/api/chat/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch (err) {
      console.error('保存设置失败:', err);
    } finally {
      setSettingsLoading(false);
    }
  }, [settings]);

  // 初始化
  useEffect(() => {
    loadConversations();
    loadSettings();
  }, [loadConversations, loadSettings]);

  // 切换会话时加载消息
  useEffect(() => {
    if (currentConvId) {
      loadMessages(currentConvId);
    }
  }, [currentConvId, loadMessages]);

  // 消息变化时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 创建新会话
  const createConversation = async () => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.data) {
        setCurrentConvId(json.data.id);
        setMessages([]);
        setSidebarOpen(false);
        await loadConversations();
      }
    } catch (err) {
      setError('创建会话失败');
    }
  };

  // 删除会话
  const deleteConversation = async (id) => {
    if (!confirm('确定删除这个对话吗？')) return;
    try {
      await fetch(`/api/chat/${id}`, { method: 'DELETE' });
      if (currentConvId === id) {
        setCurrentConvId(null);
        setMessages([]);
      }
      await loadConversations();
    } catch (err) {
      setError('删除会话失败');
    }
  };

  // 发送消息（SSE 流式）
  const sendMessage = async () => {
    if (!input.trim() || streaming) return;

    let convId = currentConvId;

    // 如果没有当前会话，先创建一个
    if (!convId) {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const json = await res.json();
        if (json.data) {
          convId = json.data.id;
          setCurrentConvId(convId);
          await loadConversations();
        }
      } catch (err) {
        setError('创建会话失败');
        return;
      }
    }

    const userMessage = input.trim();
    setInput('');
    setError('');

    // 立即在 UI 显示用户消息
    const tempUserMsg = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    const tempAssistantMsg = {
      id: `temp-assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempUserMsg, tempAssistantMsg]);
    setStreaming(true);
    isSendingRef.current = true;

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: convId,
          message: userMessage,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '请求失败');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              assistantContent += parsed.content;
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                updated[lastIdx] = { ...updated[lastIdx], content: assistantContent };
                return updated;
              });
            }
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) {
              throw e;
            }
          }
        }
      }

      // 重新加载消息（从数据库获取完整数据）
      await loadMessages(convId);
      await loadConversations();

    } catch (err) {
      setError(err.message);
      // 移除临时的空 assistant 消息
      setMessages(prev => prev.filter(m => m.id !== tempAssistantMsg.id));
    } finally {
      isSendingRef.current = false;
      setStreaming(false);
    }
  };

  // 处理按键
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 格式化时间
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai',
    });
  };

  return (
    <>
      <Head>
        <title>💬 Chat - Unser Raum</title>
      </Head>

      <div className="chat-layout">
        {/* 侧边栏 */}
        <aside className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="chat-sidebar-header">
            <span>🦊 对话</span>
            <button className="btn btn-secondary btn-sm" onClick={createConversation}>
              + 新对话
            </button>
          </div>

          <div className="chat-conv-list">
            {conversations.length === 0 ? (
              <div className="chat-conv-empty">还没有对话，开始第一个吧 🐱</div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`chat-conv-item ${currentConvId === conv.id ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentConvId(conv.id);
                    setSidebarOpen(false);
                  }}
                >
                  <div className="chat-conv-title">{conv.title || '新对话'}</div>
                  <div className="chat-conv-time">{formatTime(conv.updated_at)}</div>
                  <button
                    className="chat-conv-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    title="删除对话"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="chat-sidebar-footer">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              ⚙️ 设置
            </button>
          </div>
        </aside>

        {/* 移动端侧边栏遮罩 */}
        {sidebarOpen && (
          <div className="chat-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* 主区域 */}
        <main className="chat-main">
          {/* 移动端顶栏 */}
          <div className="chat-topbar">
            <button
              className="chat-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <span className="chat-topbar-title">
              {conversations.find(c => c.id === currentConvId)?.title || '💬 Unser Raum Chat'}
            </span>
            <button
              className="chat-menu-btn"
              onClick={() => setShowSettings(!showSettings)}
            >
              ⚙️
            </button>
          </div>

          {/* 消息区域 */}
          <div className="chat-messages">
            {!currentConvId && messages.length === 0 ? (
              <div className="chat-welcome">
                <div className="chat-welcome-icon">🦊</div>
                <h2>嘿，Helle</h2>
                <p>开始一段新对话吧。我会记住我们说过的每一句话。</p>
              </div>
            ) : loading ? (
              <div className="chat-loading">加载中...</div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-bubble-row ${msg.role === 'user' ? 'user' : 'assistant'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="chat-avatar">🦊</div>
                  )}
                  <div className={`chat-bubble ${msg.role}`}>
                    <div className="chat-bubble-content">
                      {msg.content || (streaming && msg.id.startsWith('temp-assistant') ? '...' : '')}
                    </div>
                    <div className="chat-bubble-time">{formatTime(msg.created_at)}</div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="chat-avatar user">🌸</div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="chat-error">
              ⚠️ {error}
            </div>
          )}

          {/* 输入区域 */}
          <div className="chat-input-area">
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={streaming ? '🦊 正在回复...' : '说点什么...'}
              disabled={streaming}
              rows={1}
            />
            <button
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
            >
              {streaming ? '...' : '↑'}
            </button>
          </div>
        </main>

        {/* 设置面板 */}
        {showSettings && (
          <div className="chat-settings-overlay" onClick={() => setShowSettings(false)}>
            <div className="chat-settings" onClick={(e) => e.stopPropagation()}>
              <h3>⚙️ 模型设置</h3>

              <div className="chat-settings-group">
                <label>System Prompt</label>
                <textarea
                  className="chat-settings-textarea"
                  value={settings.system_prompt}
                  onChange={(e) => setSettings(prev => ({ ...prev, system_prompt: e.target.value }))}
                  rows={6}
                />
              </div>

              <div className="chat-settings-group">
                <label>温度 (Temperature): {settings.temperature}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => setSettings(prev => ({ ...prev, temperature: e.target.value }))}
                  className="chat-settings-slider"
                />
                <div className="chat-settings-hint">
                  0 = 精确，1 = 平衡，2 = 创造力
                </div>
              </div>

              <div className="chat-settings-group">
                <label>每次带几条最近记忆 (0~20)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={settings.memory_count}
                  onChange={(e) => setSettings(prev => ({ ...prev, memory_count: e.target.value }))}
                  className="chat-settings-input"
                />
              </div>

              <div className="chat-settings-group">
                <label>Max Tokens</label>
                <input
                  type="number"
                  min="256"
                  max="32768"
                  value={settings.max_tokens}
                  onChange={(e) => setSettings(prev => ({ ...prev, max_tokens: e.target.value }))}
                  className="chat-settings-input"
                />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--wall)', margin: 'var(--space-md) 0' }} />

              <div className="chat-settings-group">
                <label>🔑 API Key</label>
                <input
                  type="password"
                  value={settings.llm_api_key}
                  onChange={(e) => setSettings(prev => ({ ...prev, llm_api_key: e.target.value }))}
                  placeholder="sk-xxx（DeepSeek / OpenAI 兼容）"
                  className="chat-settings-input"
                />
              </div>

              <div className="chat-settings-group">
                <label>🌐 API Base URL</label>
                <input
                  type="text"
                  value={settings.llm_base_url}
                  onChange={(e) => setSettings(prev => ({ ...prev, llm_base_url: e.target.value }))}
                  placeholder="https://api.deepseek.com"
                  className="chat-settings-input"
                />
              </div>

              <div className="chat-settings-actions">
                <button
                  className="btn btn-primary"
                  onClick={saveSettings}
                  disabled={settingsLoading}
                >
                  {settingsLoading ? '保存中...' : '💾 保存设置'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowSettings(false)}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
