import { supabase } from '../../../../lib/supabase';

export default async function handler(req, res) {
  const { messageId } = req.query;

  if (!messageId) {
    return res.status(400).json({ error: '缺少消息 id' });
  }

  if (req.method === 'PUT') {
    const { content, prune_after = true } = req.body || {};

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'content 不能为空' });
    }

    const { data: message, error: msgError } = await supabase
      .from('chat_messages')
      .select('id, conversation_id, role, created_at')
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      return res.status(404).json({ error: '消息不存在' });
    }

    if (message.role !== 'user') {
      return res.status(400).json({ error: '只能编辑用户消息' });
    }

    if (prune_after) {
      const { error: pruneError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', message.conversation_id)
        .gt('created_at', message.created_at);

      if (pruneError) {
        return res.status(500).json({ error: pruneError.message });
      }
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .update({ content: content.trim() })
      .eq('id', messageId)
      .select('id, role, content, created_at, conversation_id')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', message.conversation_id);

    return res.json({ data });
  }

  if (req.method === 'DELETE') {
    const { prune_after = true } = req.query;

    const { data: message, error: msgError } = await supabase
      .from('chat_messages')
      .select('id, conversation_id, created_at')
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      return res.status(404).json({ error: '消息不存在' });
    }

    if (prune_after === 'true') {
      const { error: pruneError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', message.conversation_id)
        .gte('created_at', message.created_at);

      if (pruneError) {
        return res.status(500).json({ error: pruneError.message });
      }
    } else {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        return res.status(500).json({ error: error.message });
      }
    }

    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', message.conversation_id);

    return res.json({ success: true });
  }

  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
