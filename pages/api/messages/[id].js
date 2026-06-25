import { supabase } from '../../../lib/supabase';
import { identifyAuthor } from '../../../lib/auth';

export default async function handler(req, res) {
  const author = identifyAuthor(req);
  if (!author) {
    return res.status(401).json({ error: '未授权：请提供有效的 API Key' });
  }

  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: '留言不存在' });
      res.status(200).json({ data, message: '已软删除' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: '方法不允许' });
}
