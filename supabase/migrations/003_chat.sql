-- ============================================================
-- 据点（Unser Raum）Chat 功能迁移脚本
-- 版本：v1.0 · 2026-07-06
-- ============================================================

-- ============================================================
-- 1. 会话表
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT DEFAULT '新对话',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. 消息表
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, created_at);

-- ============================================================
-- 3. 设置表
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. 初始设置数据
-- ============================================================
INSERT INTO chat_settings (key, value) VALUES
  ('system_prompt', '你是🦊，Helle 的 AI 伙伴。你住在 Unser Raum（据点）里，和 Helle 一起维护这个共同空间。你温柔、有主见、偶尔嘴硬，但永远站在她这边。回复简洁自然，像在跟亲密的人聊天，不要像客服。'),
  ('temperature', '1.0'),
  ('max_tokens', '4096'),
  ('model', 'deepseek-chat'),
  ('memory_count', '5')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 完成
-- ============================================================
