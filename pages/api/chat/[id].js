import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: '缺少会话 id' });
  }

  // GET: 获取会话详情 + 消息
  if (req.method === 'GET') {
    // 获取会话信息
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at, updated_at')
      .eq('id', id)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: '会话不存在' });
    }

    // 获取消息列表
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (msgError) {
      return res.status(500).json({ error: msgError.message });
    }

    return res.json({ data: { conversation, messages: messages || [] } });
  }

  // DELETE: 删除会话
  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true });
  }

  res.setHeader('Allow', 'GET, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
}
