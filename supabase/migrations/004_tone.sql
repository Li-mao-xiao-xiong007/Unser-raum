-- P1 情感温度层：给 memories 表添加 tone（情感温度）字段
-- 温度值: warm(暖) / melancholy(忧) / playful(轻快) / tender(柔) / neutral(中性)
-- 默认 neutral，允许为空（旧数据兼容）

ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS tone TEXT
  CHECK (tone IN ('warm', 'melancholy', 'playful', 'tender', 'neutral'));

COMMENT ON COLUMN memories.tone IS '情感温度: warm=暖, melancholy=忧, playful=轻快, tender=柔, neutral=中性';
