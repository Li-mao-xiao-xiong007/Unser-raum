-- P3 翻篇机制：给 memories 表添加 status（三态）字段
-- 三态:
--   active(鲜活) — 默认态，日常浮现
--   sunk(沉底)   — 翻篇了，不再主动提及，主动提起才翻出
--   frozen(固化) — 里程碑/命名石，永久高位
-- 默认 active，允许为空（旧数据兼容为 active 语义）

ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 删除旧约束（如果存在）
ALTER TABLE memories DROP CONSTRAINT IF EXISTS memories_status_check;

ALTER TABLE memories
  ADD CONSTRAINT memories_status_check CHECK (status IN ('active', 'sunk', 'frozen'));

COMMENT ON COLUMN memories.status IS '翻篇三态: active=鲜活(日常浮现), sunk=沉底(主动提起才出现), frozen=固化(永久高位)';
