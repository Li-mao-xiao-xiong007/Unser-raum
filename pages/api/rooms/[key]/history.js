import { supabase } from '../../../../lib/supabase';
import { identifyAuthor } from '../../../../lib/auth';

export default async function handler(req, res) {
  const author = identifyAuthor(req);
  if (!author) {
    return res.status(401).json({ error: '未授权：请提供有效的 API Key' });
  }

  const { key } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('room_history')
        .select('*')
        .eq('room_key', key)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json({ data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: '方法不允许' });
}
