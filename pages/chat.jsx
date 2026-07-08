import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';

function makeTempMessage(role, content = '', extra = {}) {
  return {
    id: `temp-${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    created_at: new Date().toISOString(),
    ...extra,
  };
}

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
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [lastFailedAction, setLastFailedAction] = useState(null);
  const [viewportHeight, setViewportHeight] = useState(undefined);

  const messagesEndRef = useRef(null);
  const messagesPanelRef = useRef(null);
  const textareaRef = useRef(null);
  const isSendingRef = useRef(false);
  const abortControllerRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    requestAnimationFrame(() => {
      if (messagesPanelRef.current) {
        messagesPanelRef.current.scrollTo({
          top: messagesPanelRef.current.scrollHeight,
          behavior,
        });
      }
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
  }, []);

  const scrollToBottomAfterKeyboard = useCallback(() => {
    scrollToBottom('auto');
    window.setTimeout(() => scrollToBottom('smooth'), 80);
    window.setTimeout(() => scrollToBottom('smooth'), 280);
  }, [scrollToBottom]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat');
      const json = await res.json();
      setConversations(json.data || []);
    } catch (err) {
      console.error('加载会话列表失败:', err);
    }
  }, []);

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

  useEffect(() => {
    loadConversations();
    loadSettings();
  }, [loadConversations, loadSettings]);

  useEffect(() => {
    if (currentConvId) {
      loadMessages(currentConvId);
    }
  }, [currentConvId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleViewportChange = () => {
      setViewportHeight(viewport.height);
      scrollToBottomAfterKeyboard();
      // 确保输入框可见
      if (textareaRef.current && viewport.height < window.innerHeight) {
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // 给浏览器一点时间完成键盘弹出后的重排，再滚一次
        setTimeout(() => {
          textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 200);
      }
    };

    // 初始化
    setViewportHeight(viewport.height);

    viewport.addEventListener('resize', handleViewportChange);
    viewport.addEventListener('scroll', handleViewportChange);

    return () => {
      viewport.removeEventListener('resize', handleViewportChange);
      viewport.removeEventListener('scroll', handleViewportChange);
    };
  }, [scrollToBottomAfterKeyboard]);

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

  const ensureConversation = async () => {
    if (currentConvId) return currentConvId;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await res.json();

    if (!json.data) {
      throw new Error(json.error || '创建会话失败');
    }

    setCurrentConvId(json.data.id);
    await loadConversations();
    return json.data.id;
  };

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

  const patchAssistantMessage = (messageId, patch) => {
    setMessages(prev => prev.map(msg => (
      msg.id === messageId ? { ...msg, ...patch } : msg
    )));
  };

  const streamAssistant = async ({ conversationId, message, fromMessageId, pruneAfter = false, mode = 'send', tempUserId = null }) => {
    if (streaming) return;

    const tempAssistantMsg = makeTempMessage('assistant', '', { status: 'streaming' });
    setMessages(prev => [...prev, tempAssistantMsg]);
    setError('');
    setStreaming(true);
    setLastFailedAction(null);
    isSendingRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let assistantContent = '';
    let aborted = false;

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          message,
          from_message_id: fromMessageId,
          prune_after: pruneAfter,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '请求失败');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
            if (parsed.user_message) {
              setMessages(prev => prev.map(msg => (
                msg.id === tempUserId || msg.id === parsed.user_message.id
                  ? parsed.user_message
                  : msg
              )));
              fromMessageId = parsed.user_message.id;
            }
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) {
              assistantContent += parsed.content;
              patchAssistantMessage(tempAssistantMsg.id, {
                content: assistantContent,
                status: 'streaming',
              });
            }
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      }

      patchAssistantMessage(tempAssistantMsg.id, {
        content: assistantContent,
        status: assistantContent ? 'done' : 'empty',
      });

      await loadMessages(conversationId);
      await loadConversations();
    } catch (err) {
      aborted = err.name === 'AbortError';
      if (aborted) {
        patchAssistantMessage(tempAssistantMsg.id, {
          content: assistantContent || '已停止生成。',
          status: 'stopped',
        });
      } else {
        const messageText = err.message || '请求失败';
        setError(messageText);
        setLastFailedAction({
          conversationId,
          message: fromMessageId ? undefined : message,
          fromMessageId,
          pruneAfter,
          mode,
        });
        patchAssistantMessage(tempAssistantMsg.id, {
          content: `生成失败：${messageText}`,
          status: 'failed',
        });
      }
    } finally {
      isSendingRef.current = false;
      setStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;

    try {
      const convId = await ensureConversation();
      const userMessage = input.trim();
      setInput('');
      setError('');

      const tempUserMsg = makeTempMessage('user', userMessage);
      setMessages(prev => [...prev, tempUserMsg]);

      await streamAssistant({
        conversationId: convId,
        message: userMessage,
        mode: 'send',
        tempUserId: tempUserMsg.id,
      });
    } catch (err) {
      setError(err.message || '发送失败');
    }
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const retryLastFailure = async () => {
    if (!lastFailedAction || streaming) return;
    const action = lastFailedAction;
    setLastFailedAction(null);
    setError('');
    setMessages(prev => prev.filter(msg => msg.status !== 'failed'));
    await streamAssistant(action);
  };

  const findPreviousUserMessage = (assistantIndex) => {
    for (let i = assistantIndex - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'user' && !String(messages[i].id).startsWith('temp-')) {
        return messages[i];
      }
    }
    return null;
  };

  const regenerateFromMessage = async (userMsg) => {
    if (!currentConvId || !userMsg || streaming) return;

    setError('');
    setEditingMessageId(null);
    setEditingContent('');
    setMessages(prev => {
      const idx = prev.findIndex(msg => msg.id === userMsg.id);
      return idx >= 0 ? prev.slice(0, idx + 1) : prev;
    });

    await streamAssistant({
      conversationId: currentConvId,
      fromMessageId: userMsg.id,
      pruneAfter: true,
      mode: 'regenerate',
    });
  };

  const startEditMessage = (msg) => {
    if (streaming || msg.role !== 'user' || String(msg.id).startsWith('temp-')) return;
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const saveEditedMessage = async (msg) => {
    if (!currentConvId || !editingContent.trim() || streaming) return;

    try {
      const res = await fetch(`/api/chat/messages/${msg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingContent.trim(), prune_after: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '保存失败');

      const updated = json.data;
      setMessages(prev => {
        const idx = prev.findIndex(item => item.id === msg.id);
        if (idx < 0) return prev;
        return [...prev.slice(0, idx), updated];
      });
      setEditingMessageId(null);
      setEditingContent('');

      await streamAssistant({
        conversationId: currentConvId,
        fromMessageId: updated.id,
        pruneAfter: false,
        mode: 'edit',
      });
    } catch (err) {
      setError(err.message || '编辑失败');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEditKeyDown = (e, msg) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveEditedMessage(msg);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditMessage();
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai',
    });
  };

  const renderMessage = (msg, index) => {
    const isTemp = String(msg.id).startsWith('temp-');
    const previousUser = msg.role === 'assistant' ? findPreviousUserMessage(index) : null;
    const isEditing = editingMessageId === msg.id;

    return (
      <div
        key={msg.id}
        className={`chat-bubble-row ${msg.role === 'user' ? 'user' : 'assistant'}`}
      >
        {msg.role === 'assistant' && (
          <div className="chat-avatar">🦊</div>
        )}

        <div className={`chat-bubble ${msg.role} ${msg.status ? `status-${msg.status}` : ''}`}>
          {isEditing ? (
            <div className="chat-edit-box">
              <textarea
                className="chat-edit-textarea"
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                onKeyDown={(e) => handleEditKeyDown(e, msg)}
                rows={4}
                autoFocus
              />
              <div className="chat-edit-actions">
                <button className="chat-action-btn primary" onClick={() => saveEditedMessage(msg)} disabled={!editingContent.trim()}>
                  保存并重生成
                </button>
                <button className="chat-action-btn" onClick={cancelEditMessage}>
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="chat-bubble-content">
                {msg.content || (streaming && msg.status === 'streaming' ? '...' : '')}
              </div>
              <div className="chat-bubble-footer">
                <span className="chat-bubble-time">{formatTime(msg.created_at)}</span>
                {msg.status === 'stopped' && <span className="chat-message-status">已停止</span>}
                {msg.status === 'failed' && <span className="chat-message-status error">失败</span>}
              </div>
              {!isTemp && (
                <div className="chat-message-actions">
                  {msg.role === 'user' && (
                    <button className="chat-action-btn" onClick={() => startEditMessage(msg)} disabled={streaming}>
                      编辑
                    </button>
                  )}
                  {msg.role === 'assistant' && previousUser && (
                    <button
                      className="chat-action-btn regenerate"
                      onClick={() => regenerateFromMessage(previousUser)}
                      disabled={streaming}
                      title="基于上一条用户消息重新生成这条回复"
                    >
                      ↻ 重新生成
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {msg.role === 'user' && (
          <div className="chat-avatar user">🌸</div>
        )}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>💬 Chat - Unser Raum</title>
      </Head>

      <div className="chat-layout" style={viewportHeight ? { height: `${viewportHeight - 60}px` } : undefined}>
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

        {sidebarOpen && (
          <div className="chat-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <main className="chat-main">
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

          <div className="chat-messages" ref={messagesPanelRef}>
            {!currentConvId && messages.length === 0 ? (
              <div className="chat-welcome">
                <div className="chat-welcome-icon">🦊</div>
                <h2>嘿，Helle</h2>
                <p>开始一段新对话吧。我会记住我们说过的每一句话。</p>
              </div>
            ) : loading ? (
              <div className="chat-loading">加载中...</div>
            ) : (
              messages.map(renderMessage)
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="chat-error">
              <span>⚠️ {error}</span>
              {lastFailedAction && (
                <button className="chat-error-retry" onClick={retryLastFailure} disabled={streaming}>
                  重试
                </button>
              )}
            </div>
          )}

          <div className="chat-input-area">
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                scrollToBottomAfterKeyboard();
              }}
              onFocus={scrollToBottomAfterKeyboard}
              onClick={scrollToBottomAfterKeyboard}
              onKeyDown={handleKeyDown}
              placeholder={streaming ? '🦊 正在回复...' : '说点什么...'}
              disabled={streaming}
              rows={1}
            />
            {streaming ? (
              <button
                className="chat-send-btn stop"
                onClick={stopGeneration}
                title="停止生成"
              >
                ■
              </button>
            ) : (
              <button
                className="chat-send-btn"
                onClick={sendMessage}
                disabled={!input.trim()}
                title="发送"
              >
                ↑
              </button>
            )}
          </div>
        </main>

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
