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
    const [memoriesRes, messagesRes, roomsRes, historyRes] = await Promise.all([
      supabase.from('memories').select('*').is('deleted_at', null).order('created_at'),
      supabase.from('messages').select('*').is('deleted_at', null).order('created_at'),
      supabase.from('rooms').select('*').order('key'),
      supabase.from('room_history').select('*').order('created_at'),
    ]);

    res.status(200).json({
      exported_at: new Date().toISOString(),
      memories: memoriesRes.data || [],
      messages: messagesRes.data || [],
      rooms: roomsRes.data || [],
      room_history: historyRes.data || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
