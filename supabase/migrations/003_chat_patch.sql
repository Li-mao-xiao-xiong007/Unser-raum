-- ============================================================
-- 补充迁移：为已有数据库添加 llm_api_key 和 llm_base_url
-- 如果是全新部署（刚跑过 003_chat.sql），这条会自动跳过
-- ============================================================

INSERT INTO chat_settings (key, value) VALUES
  ('llm_api_key', ''),
  ('llm_base_url', 'https://api.deepseek.com')
ON CONFLICT (key) DO NOTHING;
