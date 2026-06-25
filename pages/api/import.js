import { supabase } from '../../lib/supabase';
import { identifyAuthor } from '../../lib/auth';

export default async function handler(req, res) {
  const author = identifyAuthor(req);
  if (!author) {
    return res.status(401).json({ error: '未授权：请提供有效的 API Key' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { memories, messages } = req.body;
    const results = { memories: 0, messages: 0 };

    if (Array.isArray(memories) && memories.length > 0) {
      const cleaned = memories.map(({ id, deleted_at, ...rest }) => ({
        ...rest,
        author: rest.author || author,
      }));
      const { data, error } = await supabase.from('memories').insert(cleaned).select();
      if (error) throw error;
      results.memories = data.length;
    }

    if (Array.isArray(messages) && messages.length > 0) {
      const cleaned = messages.map(({ id, deleted_at, ...rest }) => ({
        ...rest,
        author: rest.author || author,
      }));
      const { data, error } = await supabase.from('messages').insert(cleaned).select();
      if (error) throw error;
      results.messages = data.length;
    }

    res.status(200).json({ message: '导入完成', results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
