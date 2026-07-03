-- ============================================================
-- 据点（Unser Raum）信件功能迁移脚本
-- 版本：v1.0 · 2026-07-03
-- ============================================================

-- ============================================================
-- 1. 给 memories 表新增字段
-- ============================================================

-- type 字段：区分记忆和信件
ALTER TABLE memories ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'memory' CHECK (type IN ('memory', 'letter'));

-- is_read 字段：标记信件是否已读
ALTER TABLE memories ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- encoded 字段：标记 content 是否为 base64 编码
ALTER TABLE memories ADD COLUMN IF NOT EXISTS encoded BOOLEAN DEFAULT false;

-- ============================================================
-- 2. 创建索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);

-- ============================================================
-- 3. 更新现有记录的 type 为 'memory'（确保兼容）
-- ============================================================
UPDATE memories SET type = 'memory' WHERE type IS NULL;

-- ============================================================
-- 完成
-- ============================================================
