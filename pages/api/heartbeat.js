import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from('chat_settings')
      .upsert(
        { key: 'heartbeat', value: new Date().toISOString() },
        { onConflict: 'key' }
      )
      .select('key')
      .single();

    if (error) throw error;

    res.status(200).json({ ok: true, time: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
