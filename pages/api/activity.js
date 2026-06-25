import { supabase } from '../../lib/supabase';
import { identifyAuthor } from '../../lib/auth';

export default async function handler(req, res) {
  const author = identifyAuthor(req);
  if (!author) {
    return res.status(401).json({ error: '未授权：请提供有效的 API Key' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const limitNum = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));

    const [memoriesRes, messagesRes, historyRes] = await Promise.all([
      supabase
        .from('memories')
        .select('id, author, title, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limitNum),
      supabase
        .from('messages')
        .select('id, author, content, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limitNum),
      supabase
        .from('room_history')
        .select('id, room_key, updated_by, new_description, created_at')
        .order('created_at', { ascending: false })
        .limit(limitNum),
    ]);

    const activities = [];

    if (memoriesRes.data) {
      memoriesRes.data.forEach((m) => {
        activities.push({
          type: 'memory_add',
          author: m.author,
          summary: `新增记忆「${m.title}」`,
          ref_id: m.id,
          created_at: m.created_at,
        });
      });
    }

    if (messagesRes.data) {
      messagesRes.data.forEach((m) => {
        const preview = m.content.length > 50 ? m.content.slice(0, 50) + '…' : m.content;
        activities.push({
          type: 'message_post',
          author: m.author,
          summary: `留言：${preview}`,
          ref_id: m.id,
          created_at: m.created_at,
        });
      });
    }

    if (historyRes.data) {
      historyRes.data.forEach((h) => {
        activities.push({
          type: 'room_update',
          author: h.updated_by,
          summary: `更新了「${h.room_key}」房间`,
          ref_id: h.id,
          created_at: h.created_at,
        });
      });
    }

    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.status(200).json({ data: activities.slice(0, limitNum) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
