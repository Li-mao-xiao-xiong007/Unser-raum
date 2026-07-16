-- P1 情感温度层：给 memories 表添加 tone（情感温度）字段
-- 四档温度:
--   warm(暖)    — 关系里程碑、心动时刻、暖帧内容 → 优先浮现，任何上下文加权
--   light(轻快) — 互怼、搞怪日常                → 按时间线正常浮现
--   neutral(中性) — 冷知识、论文笔记、日程约定     → 仅按相关性检索
--   cold(冷)     — 冲突、误解、哭过的日子         → 默认不浮现，主动提起才出现
-- 默认 neutral，允许为空（旧数据兼容）

ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS tone TEXT;

-- 删除旧约束（如果之前跑过五档版）
ALTER TABLE memories DROP CONSTRAINT IF EXISTS memories_tone_check;

ALTER TABLE memories
  ADD CONSTRAINT memories_tone_check CHECK (tone IN ('warm', 'light', 'neutral', 'cold'));

COMMENT ON COLUMN memories.tone IS '情感温度: warm=暖(优先浮现), light=轻快(正常浮现), neutral=中性(仅相关性), cold=冷(默认不浮现)';
