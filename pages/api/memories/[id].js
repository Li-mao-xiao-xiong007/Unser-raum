import { supabase } from '../../../lib/supabase';
import { identifyAuthor } from '../../../lib/auth';

export default async function handler(req, res) {
  const author = identifyAuthor(req);
  if (!author) {
    return res.status(401).json({ error: '未授权：请提供有效的 API Key' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: '记忆不存在' });
      res.status(200).json({ data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === 'PUT') {
    try {
      const { title, content, weight, category, tags, source, is_pinned, is_read, type, encoded } = req.body;
      const updates = {};

      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      if (weight !== undefined) updates.weight = weight;
      if (category !== undefined) updates.category = category;
      if (tags !== undefined) updates.tags = tags;
      if (source !== undefined) updates.source = source;
      if (is_pinned !== undefined) updates.is_pinned = is_pinned;
      if (is_read !== undefined) updates.is_read = is_read;
      if (type !== undefined) updates.type = type;
      if (encoded !== undefined) updates.encoded = encoded;
      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('memories')
        .update(updates)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: '记忆不存在' });
      res.status(200).json({ data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      const { data, error } = await supabase
        .from('memories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: '记忆不存在' });
      res.status(200).json({ data, message: '已软删除' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: '方法不允许' });
}
