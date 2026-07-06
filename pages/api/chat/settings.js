import { supabase } from '../../../lib/supabase';
import { identifyAuthor } from '../../../lib/auth';

export default async function handler(req, res) {
  const author = identifyAuthor(req);

  // GET: 获取所有设置
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('chat_settings')
      .select('key, value, updated_at');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const settings = {};
    (data || []).forEach(row => {
      settings[row.key] = row.value;
    });

    return res.json({ data: settings });
  }

  // PUT: 更新设置
  if (req.method === 'PUT') {
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: '请求体应为 JSON 对象' });
    }

    // 允许更新的 key 白名单
    const allowedKeys = ['system_prompt', 'temperature', 'max_tokens', 'model', 'memory_count'];
    const results = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key)) {
        continue;
      }

      // 类型校验
      if (key === 'temperature') {
        const t = parseFloat(value);
        if (isNaN(t) || t < 0 || t > 2) {
          return res.status(400).json({ error: 'temperature 应为 0~2 之间的数字' });
        }
      }
      if (key === 'max_tokens') {
        const m = parseInt(value);
        if (isNaN(m) || m < 1 || m > 32768) {
          return res.status(400).json({ error: 'max_tokens 应为 1~32768 之间的整数' });
        }
      }
      if (key === 'memory_count') {
        const c = parseInt(value);
        if (isNaN(c) || c < 0 || c > 20) {
          return res.status(400).json({ error: 'memory_count 应为 0~20 之间的整数' });
        }
      }

      const { error } = await supabase
        .from('chat_settings')
        .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) {
        return res.status(500).json({ error: `更新 ${key} 失败: ${error.message}` });
      }
      results.push(key);
    }

    return res.json({ success: true, updated: results });
  }

  res.setHeader('Allow', 'GET, PUT');
  res.status(405).json({ error: 'Method not allowed' });
}
