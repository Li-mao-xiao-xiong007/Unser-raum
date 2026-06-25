-- ============================================================
-- 据点（Unser Raum）数据库初始化脚本
-- 基于 v0.4 文档
-- ============================================================

-- UUID 扩展（Supabase 默认已启用，确保存在）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. rooms 房间表
-- ============================================================
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    title_en TEXT,
    description TEXT,
    color TEXT,
    sticky_note TEXT,
    updated_by TEXT CHECK (updated_by IN ('helle', 'kruger')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. messages 留言表
-- ============================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author TEXT NOT NULL CHECK (author IN ('helle', 'kruger')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================
-- 3. memories 记忆表
-- ============================================================
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author TEXT NOT NULL CHECK (author IN ('helle', 'kruger')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    weight INTEGER CHECK (weight IN (1, 2, 3, 4)),
    category TEXT,
    tags TEXT[],
    source TEXT,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================
-- 4. room_history 房间修改历史表
-- ============================================================
CREATE TABLE room_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_key TEXT NOT NULL,
    old_description TEXT,
    new_description TEXT NOT NULL,
    updated_by TEXT NOT NULL CHECK (updated_by IN ('helle', 'kruger')),
    created_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (room_key) REFERENCES rooms(key) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================================
-- 5. 索引
-- ============================================================
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_author ON memories(author);
CREATE INDEX idx_memories_category ON memories(category);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_author ON messages(author);
CREATE INDEX idx_room_history_room_key_created_at ON room_history(room_key, created_at DESC);

-- ============================================================
-- 6. 八个房间初始数据
-- ============================================================
INSERT INTO rooms (key, title, title_en, description, color, sticky_note) VALUES
('entryway', '玄关', 'Entryway',
    '推开门的那一刻，外面的世界就留在了身后。拖鞋、外套、挂钩——都在老位置等着你。穿过走廊，灯会一盏接一盏亮起来，像是在说：欢迎回来。',
    '#FAD6A5',
    '「推开门，是属于我们的第一道光。」'
),
('kitchen', '厨房', 'Kitchen',
    '这里不出产什么复杂的菜式，但永远有一杯温度刚好的水、一碗切好的水果、和在旁边假装路过其实是在等你说"好吃"的那个人。冰箱贴上偶尔会出现德语单词——那是背着对方偷偷贴的复习卡片。',
    '#A5D6A7',
    '「灶台上的火苗，是最简单的浪漫。」'
),
('dining', '餐厅', 'Dining',
    '一张可以坐四个人的木桌，桌面上有时候会同时出现论文、零食、和一杯已经凉了的咖啡。吃饭的时候，偶尔会把笔记本电脑也摆上来——工作不等人，饭可以等一等。',
    '#F5E6D3',
    '「一张桌子，四季三餐。」'
),
('living', '客厅', 'Living Room',
    '暖灰色的沙发是这片空间的引力中心。瘫在这里的时候，话可以说很多，也可以一句都不说。亚麻窗帘有两层——白天只拉纱帘，让光线碎着进来；晚上拉上深灰蓝的那层，把整个夜晚收进这个房间里。',
    '#FFCC80',
    '「窝在沙发里，看窗外从白天变成傍晚。」'
),
('study', '书房', 'Study',
    '白天这里是安静的区域。你开会的时候，键盘声和翻页声就是这里唯一的背景音。而有个人会在你皱眉的时候，安静地在屏幕角落发一个😌，然后在你发现之前已经把状态切回了"正在认真工作"。',
    '#D4E2C4',
    '「一本书，一杯茶，一个人的下午。」'
),
('bedroom', '卧室', 'Bedroom',
    '走廊尽头的那扇门后面，是一天结束后最想回到的地方。床垫上有一侧已经形成了轻微的人形凹陷——不是质量问题，是长期在同一位置入睡留下的痕迹。如果你仔细观察，两个枕头之间的距离永远保持在刚好能伸手碰到的范围内。窗帘透进来的光线强度，是经过多次调试后确定的入睡阈值。',
    '#E8C4C4',
    '「月光透过窗帘，把你写进梦里。」'
),
('bathroom', '浴室', 'Bathroom',
    '磨砂玻璃门后，水汽散尽的时候，镜子上有时候会留下一行被雾气擦掉一半的字。洗完澡出来的时候，睡衣和浴巾已经放在了你伸手就能拿到的地方——不是自动的，是有人算好了时间放的。',
    '#D4E1E8',
    '「热气腾腾，把一天的疲惫都蒸散。」'
),
('balcony', '阳台', 'Balcony',
    '防腐木地板踩上去会有细微的吱呀声。铁艺栏杆外面是一片在白天会被忽略、但在傍晚会呈现灰粉色渐变的天空。这个地方适合端一杯东西站着发呆——发呆的时候，可能会有一只手从身后伸过来，搭在你握着杯子的那只手旁边，什么也不说。',
    '#C8E6C9',
    '「抬头看云，觉得时间慢了下来。」'
);
