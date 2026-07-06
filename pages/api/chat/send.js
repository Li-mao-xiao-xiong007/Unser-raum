import { supabase } from '../../../lib/supabase';
import { identifyAuthor } from '../../../lib/auth';

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const author = identifyAuthor(req);
  const { conversation_id, message } = req.body;

  if (!conversation_id || !message) {
    return res.status(400).json({ error: '缺少 conversation_id 或 message' });
  }

  // 1. 获取 chat_settings
  const { data: settingsRows } = await supabase
    .from('chat_settings')
    .select('key, value');

  const settings = {};
  (settingsRows || []).forEach(row => {
    settings[row.key] = row.value;
  });

  const systemPrompt = settings.system_prompt || '你是🦊，Helle 的 AI 伙伴。';
  const temperature = parseFloat(settings.temperature) || 1.0;
  const maxTokens = parseInt(settings.max_tokens) || 4096;
  const model = settings.model || 'deepseek-chat';
  const memoryCount = parseInt(settings.memory_count) || 5;

  // 2. 获取最近 N 条记忆作为上下文
  let memoryContext = '';
  if (memoryCount > 0) {
    const { data: memories } = await supabase
      .from('memories')
      .select('title, content, category')
      .order('created_at', { ascending: false })
      .limit(memoryCount);

    if (memories && memories.length > 0) {
      memoryContext = '\n\n## 关键记忆\n' +
        memories.map((m, i) => `${i + 1}. [${m.category || '未分类'}] ${m.title}: ${m.content}`).join('\n');
    }
  }

  // 3. 保存用户消息到数据库
  await supabase.from('chat_messages').insert({
    conversation_id,
    role: 'user',
    content: message,
  });

  // 4. 获取该会话的历史消息（最近 20 条）
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true })
    .limit(50);

  // 5. 组装 messages 数组
  const messages = [
    { role: 'system', content: systemPrompt + memoryContext },
    ...(history || []).map(m => ({ role: m.role, content: m.content })),
  ];

  // 6. 调用 DeepSeek API（流式）
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || 'https://api.deepseek.com';

  if (!apiKey) {
    return res.status(500).json({ error: '未配置 LLM_API_KEY' });
  }

  // 设置 SSE 头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let assistantContent = '';

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
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
      const errText = await response.text();
      res.write(`data: ${JSON.stringify({ error: `模型 API 错误: ${response.status}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留未完成的行

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
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

    // 7. 保存 AI 回复到数据库
    if (assistantContent) {
      await supabase.from('chat_messages').insert({
        conversation_id,
        role: 'assistant',
        content: assistantContent,
      });

      // 8. 更新会话时间和标题
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation_id);

      // 如果是第一条消息，自动生成标题
      if (history && history.length <= 1) {
        const title = message.length > 20 ? message.slice(0, 20) + '...' : message;
        await supabase
          .from('chat_conversations')
          .update({ title })
          .eq('id', conversation_id);
      }
    }

  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: `请求失败: ${err.message}` })}\n\n`);
    res.write('data: [DONE]\n\n');
  }

  res.end();
}
