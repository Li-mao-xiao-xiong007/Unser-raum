import { supabase } from '../../../lib/supabase';
import { identifyAuthor } from '../../../lib/auth';

export default async function handler(req, res) {
  const author = identifyAuthor(req);
  if (!author) {
    return res.status(401).json({ error: '未授权：请提供有效的 API Key' });
  }

  if (req.method === 'GET') {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        tag,
        q,
        pinned,
        type,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      let query = supabase
        .from('memories')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      // type 过滤：默认只返回记忆，不返回信件
      if (type === 'letter') {
        query = query.eq('type', 'letter');
      } else if (type === 'all') {
        // 不过滤 type，返回全部
      } else {
        // 默认：只返回记忆（type='memory' 或 type 为 null 的旧数据）
        query = query.or('type.eq.memory,type.is.null');
      }

      if (category) query = query.eq('category', category);
      if (tag) query = query.contains('tags', [tag]);
      if (pinned === 'true') query = query.eq('is_pinned', true);
      if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);

      const { data, error, count } = await query;
      if (error) throw error;

      res.status(200).json({
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages: Math.ceil(count / limitNum),
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const { title, content, weight, category, tags, source, is_pinned, type: memType, encoded } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'title 和 content 为必填字段' });
      }

      const { data, error } = await supabase
        .from('memories')
        .insert({
          author,
          title,
          content,
          weight: weight || null,
          category: category || null,
          tags: tags || [],
          source: source || null,
          is_pinned: is_pinned || false,
          type: memType || 'memory',
          encoded: encoded || false,
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: '方法不允许' });
}
