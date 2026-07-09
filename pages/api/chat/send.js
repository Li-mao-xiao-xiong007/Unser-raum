import { supabase } from '../../../lib/supabase';
import { identifyAuthor } from '../../../lib/auth';

export const config = {
  api: {
    responseLimit: false,
  },
};

function buildSettings(rows) {
  const settings = {};
  (rows || []).forEach(row => {
    settings[row.key] = row.value;
  });
  return settings;
}

function extractKeywords(text) {
  if (!text) return [];
  const cleaned = text
    .replace(/[，。！？、；：""''（）【】《》\s,.!?;:"'()\[\]<>\-—…]/g, ' ')
    .trim()
    .toLowerCase();
  const words = cleaned.split(/\s+/).filter(w => w.length >= 2);

  if (text.length <= 100) {
    const raw = text.toLowerCase();
    for (let n = 2; n <= 4; n++) {
      for (let i = 0; i <= raw.length - n; i++) {
        words.push(raw.slice(i, i + n));
      }
    }
  }

  return [...new Set(words)];
}

function matchScore(memory, keywords) {
  let score = 0;
  const tags = (memory.tags || []).map(t => t.toLowerCase());
  const category = (memory.category || '').toLowerCase();

  for (const kw of keywords) {
    if (kw.length < 2) continue;
    if (category && (kw === category || category.includes(kw) || kw.includes(category))) {
      score += 3;
    }
    for (const tag of tags) {
      if (kw === tag || tag.includes(kw) || kw.includes(tag)) {
        score += 2;
      }
    }
  }

  return score;
}

async function loadMemoryContext(memoryCount, userMessage) {
  if (memoryCount <= 0) return '';

  const { data: allMemories } = await supabase
    .from('memories')
    .select('title, content, category, tags, weight, is_pinned, created_at')
    .eq('type', 'memory')
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
    .order('weight', { ascending: false })
    .order('created_at', { ascending: false });

  if (!allMemories || allMemories.length === 0) return '';

  const keywords = extractKeywords(userMessage);

  const scored = allMemories.map(m => ({
    ...m,
    _score: keywords.length > 0 ? matchScore(m, keywords) : 0,
  }));

  scored.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    if (b.is_pinned !== a.is_pinned) return b.is_pinned ? 1 : -1;
    if (b.weight !== a.weight) return b.weight - a.weight;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const selected = scored.slice(0, memoryCount);

  return '\n\n## 关键记忆\n' +
    selected.map((m, i) => `${i + 1}. [${m.category || '未分类'}] ${m.title}: ${m.content}`).join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  identifyAuthor(req);
  const {
    conversation_id,
    message,
    from_message_id,
    prune_after = false,
  } = req.body || {};

  const cleanMessage = typeof message === 'string' ? message.trim() : '';

  if (!conversation_id || (!cleanMessage && !from_message_id)) {
    return res.status(400).json({ error: '缺少 conversation_id 或 message/from_message_id' });
  }

  const { data: settingsRows } = await supabase
    .from('chat_settings')
    .select('key, value');

  const settings = buildSettings(settingsRows);
  const systemPrompt = settings.system_prompt || '你是🦊，Helle 的 AI 伙伴。';
  const temperature = parseFloat(settings.temperature) || 1.0;
  const maxTokens = parseInt(settings.max_tokens) || 4096;
  const model = settings.model || 'deepseek-chat';
  const memoryCount = Math.max(0, Math.min(20, parseInt(settings.memory_count) || 0));

  let activeUserMessage = null;

  if (cleanMessage) {
    const { data: inserted, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id,
        role: 'user',
        content: cleanMessage,
      })
      .select('id, role, content, created_at')
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    activeUserMessage = inserted;
  } else {
    const { data: existing, error: existingError } = await supabase
      .from('chat_messages')
      .select('id, conversation_id, role, content, created_at')
      .eq('id', from_message_id)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({ error: '找不到要重新生成的用户消息' });
    }

    if (existing.role !== 'user') {
      return res.status(400).json({ error: '只能从用户消息重新生成' });
    }

    if (existing.conversation_id !== conversation_id) {
      return res.status(400).json({ error: '消息不属于当前会话' });
    }

    activeUserMessage = existing;
  }

  if (from_message_id && prune_after) {
    const { error: pruneError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', conversation_id)
      .gt('created_at', activeUserMessage.created_at);

    if (pruneError) {
      return res.status(500).json({ error: pruneError.message });
    }
  }

  const { data: history, error: historyError } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true })
    .limit(50);

  if (historyError) {
    return res.status(500).json({ error: historyError.message });
  }

  const memoryContext = await loadMemoryContext(memoryCount, activeUserMessage.content);
  const messages = [
    { role: 'system', content: systemPrompt + memoryContext },
    ...(history || []).map(m => ({ role: m.role, content: m.content })),
  ];

  const apiKey = settings.llm_api_key || process.env.LLM_API_KEY;
  const baseUrl = settings.llm_base_url || process.env.LLM_BASE_URL || 'https://api.deepseek.com';

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ user_message: activeUserMessage })}\n\n`);

  if (!apiKey) {
    res.write(`data: ${JSON.stringify({ error: '未配置 API Key，请在设置中填写' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  let assistantContent = '';
  let clientClosed = false;
  let responseFinished = false;
  const abortController = new AbortController();

  req.on('close', () => {
    if (!responseFinished) {
      clientClosed = true;
      abortController.abort();
    }
  });

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      signal: abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      res.write(`data: ${JSON.stringify({ error: `模型 API 错误: ${response.status}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      responseFinished = true;
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done || clientClosed) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            assistantContent += delta;
            res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
          }
        } catch (e) {
          // 跳过解析失败的行
        }
      }
    }

    if (!clientClosed && assistantContent) {
      await supabase.from('chat_messages').insert({
        conversation_id,
        role: 'assistant',
        content: assistantContent,
      });

      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation_id);

      const userMessages = (history || []).filter(m => m.role === 'user');
      if (userMessages.length <= 1) {
        const title = activeUserMessage.content.length > 20
          ? activeUserMessage.content.slice(0, 20) + '...'
          : activeUserMessage.content;

        await supabase
          .from('chat_conversations')
          .update({ title })
          .eq('id', conversation_id);
      }
    }

    if (!clientClosed) {
      res.write('data: [DONE]\n\n');
    }
  } catch (err) {
    if (!clientClosed && err.name !== 'AbortError') {
      res.write(`data: ${JSON.stringify({ error: `请求失败: ${err.message}` })}\n\n`);
      res.write('data: [DONE]\n\n');
    }
  } finally {
    if (!clientClosed) {
      responseFinished = true;
      res.end();
    }
  }
}
