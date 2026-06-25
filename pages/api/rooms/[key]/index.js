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
        .from('rooms')
        .select('*')
        .eq('key', key)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: '房间不存在' });
      res.status(200).json({ data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === 'PUT') {
    try {
      const { description } = req.body;
      if (!description) return res.status(400).json({ error: 'description 为必填字段' });

      // 先获取当前描述，用于写入历史
      const { data: current, error: fetchErr } = await supabase
        .from('rooms')
        .select('description, key')
        .eq('key', key)
        .single();

      if (fetchErr) throw fetchErr;
      if (!current) return res.status(404).json({ error: '房间不存在' });

      // 更新房间描述
      const { data, error: updateErr } = await supabase
        .from('rooms')
        .update({
          description,
          updated_by: author,
          updated_at: new Date().toISOString(),
        })
        .eq('key', key)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // 写入修改历史
      const { error: historyErr } = await supabase.from('room_history').insert({
        room_key: key,
        old_description: current.description,
        new_description: description,
        updated_by: author,
      });

      if (historyErr) {
        console.error('⚠️ 写入房间修改历史失败：', historyErr.message);
      }

      res.status(200).json({ data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: '方法不允许' });
}
