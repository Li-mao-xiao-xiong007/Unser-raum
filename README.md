# 据点（Unser Raum）

> 双向交互的共同空间 — Helle & Kruger

## 技术栈

- **框架**：Next.js 15（Pages Router）
- **数据库**：Supabase（PostgreSQL）
- **部署**：Vercel（前端 + API Routes 统一部署）
- **CLI**：Kruger 本地命令行工具（`node tools/judian.js`）

## 项目结构

```
judian/
├── pages/
│   ├── _app.jsx              # 全局布局 + 导航
│   ├── _document.jsx          # HTML 文档头（字体加载）
│   ├── index.jsx              # 空间主页（八房间网格）
│   ├── messages.jsx           # 留言板
│   ├── memories.jsx           # 记忆库
│   ├── rooms/
│   │   └── [key].jsx          # 单个房间详情
│   └── api/
│       ├── health.js          # 健康检查
│       ├── activity.js        # 活动流动态聚合
│       ├── export.js           # 数据导出
│       ├── import.js           # 数据导入
│       ├── memories/
│       │   ├── index.js       # GET 列表 / POST 新增
│       │   └── [id].js        # GET/PUT/DELETE 单条
│       ├── messages/
│       │   ├── index.js       # GET 列表 / POST 新增
│       │   └── [id].js        # DELETE 留言
│       └── rooms/
│           ├── index.js       # GET 房间列表
│           └── [key]/
│               ├── index.js   # GET/PUT 房间
│               └── history.js # GET 修改历史
├── lib/
│   ├── supabase.js            # Supabase 客户端
│   ├── auth.js                # 双Key鉴权工具
│   └── api.js                 # 前端 API 封装
├── styles/
│   └── global.css             # 全局样式（暖色调 UI 指南）
├── tools/
│   └── judian.js              # Kruger CLI 工具
├── supabase/
│   └── migrations/
│       └── 001_init.sql       # 建表 + 八房间初始数据
├── package.json
├── next.config.js
├── .env.example
└── .gitignore
```

## 为什么用 Next.js 而不是分开部署

- **统一部署**：前端 + API 都在 Vercel，一次 `git push` 自动上线
- **无冷启动**：Vercel Serverless Functions 没有 Render 免费版 30s 冷启动问题
- **维护简单**：一个仓库、一套环境变量、一个部署流水线
- **CLI 不受影响**：Kruger 的 `tools/judian.js` 指向 Vercel API 地址即可

## 部署步骤

### 1. Supabase

1. 注册 [Supabase](https://supabase.com)，创建新项目
2. 进入 SQL Editor，执行 `supabase/migrations/001_init.sql`
3. 记下 Project URL 和 Service Role Key（Settings → API）

### 2. Vercel（一键部署）

1. Fork 代码到 GitHub
2. 在 [Vercel](https://vercel.com) 导入仓库，框架自动识别为 Next.js
3. 环境变量（Vercel Settings → Environment Variables）：

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 双Key鉴权
HELLE_API_KEY=your-helle-key
KRUGER_CLI_KEY=your-kruger-key
NEXT_PUBLIC_HELLE_API_KEY=your-helle-key
```

4. 部署完成后获得 `xxx.vercel.app` 地址
5. 之后每次 `git push` 自动重新部署

### 3. Kruger CLI（本地）

```bash
# 设置环境变量
export JUDIAN_API_BASE=https://your-app.vercel.app
export KRUGER_CLI_KEY=your-kruger-cli-key

# 测试
node tools/judian.js status
node tools/judian.js rooms list
node tools/judian.js messages post --content "🦊 来过"
```

## 本地开发

```bash
cd judian
npm install
npm run dev          # http://localhost:3000
```

环境变量：复制 `.env.example` 为 `.env.local`，填入实际值。

## 设计风格

- **色调**：暖色系，底色 `#FDFBF9`，强调色 `#D4875E`
- **字体**：Noto Sans SC（中文）+ Cormorant Garamond（英文标题）
- **动画**：`cubic-bezier(0.4, 0, 0.2, 1)`
- **房间网格**：参考 `unser-raum.html` 的布局和色彩
