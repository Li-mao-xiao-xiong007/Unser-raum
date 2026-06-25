#!/usr/bin/env node

/**
 * judian.js — 据点 CLI 工具（Kruger 专用）
 *
 * 环境变量：
 *   JUDIAN_API_BASE  — 后端地址（如 https://xxx.onrender.com）
 *   KRUGER_CLI_KEY   — CLI 认证密钥
 *
 * 用法：
 *   node judian.js status
 *   node judian.js memories list [--category X] [--tag X] [--q keyword]
 *   node judian.js memories get <id>
 *   node judian.js memories add --title "..." --content "..." [--tags "a,b"] [--weight 2]
 *   node judian.js memories edit <id> --title "..." --content "..."
 *   node judian.js memories delete <id> [--yes]
 *   node judian.js messages list [--page N] [--limit N]
 *   node judian.js messages post --content "..."
 *   node judian.js messages delete <id> [--yes]
 *   node judian.js rooms list
 *   node judian.js rooms get <key>
 *   node judian.js rooms update <key> --description "..."
 *   node judian.js rooms history <key>
 */

const API_BASE = process.env.JUDIAN_API_BASE || 'http://localhost:3000';
const CLI_KEY = process.env.KRUGER_CLI_KEY || '';

// ── 工具函数 ──────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(args[i]);
    }
  }

  return { positional, flags };
}

async function api(path, { method = 'GET', body } = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-CLI-Key': CLI_KEY,
  };

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    const json = await res.json();
    if (!res.ok) {
      console.error(`❌ HTTP ${res.status}: ${json.error || '未知错误'}`);
      process.exit(1);
    }
    return json;
  } catch (err) {
    console.error(`❌ 请求失败：${err.message}`);
    console.error(`   目标地址：${url}`);
    process.exit(1);
  }
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

function confirmDelete(id) {
  // CLI 交互确认（简单实现，agent 场景用 --yes 跳过）
  return true; // 实际场景可加 readline
}

// ── 命令路由 ──────────────────────────────────────────────────

async function main() {
  const { positional, flags } = parseArgs(process.argv);
  const [cmd, subcmd, ...rest] = positional;

  if (!cmd) {
    console.log('🏠 据点 CLI 工具');
    console.log('');
    console.log('用法：');
    console.log('  node judian.js status');
    console.log('  node judian.js memories list|get|add|edit|delete ...');
    console.log('  node judian.js messages list|post|delete ...');
    console.log('  node judian.js rooms list|get|update|history ...');
    process.exit(0);
  }

  // ── status ──────────────────────────────────────────────────
  if (cmd === 'status') {
    const res = await api('/api/export');
    const m = res.memories?.length ?? 0;
    const msg = res.messages?.length ?? 0;
    const r = res.rooms?.length ?? 0;
    console.log('🏠 据点空间概览');
    console.log(`   记忆：${m} 条`);
    console.log(`   留言：${msg} 条`);
    console.log(`   房间：${r} 个`);
    console.log(`   导出时间：${formatDate(res.exported_at)}`);
    return;
  }

  // ── memories ────────────────────────────────────────────────
  if (cmd === 'memories') {
    if (subcmd === 'list') {
      const params = new URLSearchParams();
      if (flags.category) params.set('category', flags.category);
      if (flags.tag) params.set('tag', flags.tag);
      if (flags.q) params.set('q', flags.q);
      if (flags.page) params.set('page', flags.page);
      if (flags.limit) params.set('limit', flags.limit);

      const res = await api(`/api/memories?${params}`);
      const list = res.data || [];
      if (list.length === 0) {
        console.log('📭 暂无记忆');
        return;
      }
      console.log(`📦 记忆列表（共 ${res.pagination?.total ?? list.length} 条）：`);
      console.log('');
      list.forEach((m, i) => {
        const pin = m.is_pinned ? '📌 ' : '';
        const tags = m.tags?.length ? ` [${m.tags.join(', ')}]` : '';
        console.log(`${i + 1}. ${pin}${m.title}${tags}`);
        console.log(`   ID: ${m.id}`);
        console.log(`   作者: ${m.author} | 分类: ${m.category || '-'} | 重量: ${m.weight || '-'}`);
        console.log(`   时间: ${formatDate(m.created_at)}`);
        console.log('');
      });
      return;
    }

    if (subcmd === 'get') {
      const id = rest[0];
      if (!id) { console.error('❌ 请提供记忆 ID'); process.exit(1); }
      const res = await api(`/api/memories/${id}`);
      const m = res.data;
      console.log(`📌 ${m.title}`);
      console.log(`   作者: ${m.author} | 分类: ${m.category || '-'} | 重量: ${m.weight || '-'}`);
      console.log(`   标签: ${m.tags?.join(', ') || '-'}`);
      console.log(`   来源: ${m.source || '-'}`);
      console.log(`   创建: ${formatDate(m.created_at)} | 更新: ${formatDate(m.updated_at)}`);
      console.log('');
      console.log(m.content);
      return;
    }

    if (subcmd === 'add') {
      if (!flags.title || !flags.content) {
        console.error('❌ 请提供 --title 和 --content');
        process.exit(1);
      }
      const body = {
        title: flags.title,
        content: flags.content,
      };
      if (flags.weight) body.weight = parseInt(flags.weight, 10);
      if (flags.category) body.category = flags.category;
      if (flags.tags) body.tags = flags.tags.split(',').map((s) => s.trim());
      if (flags.source) body.source = flags.source;

      const res = await api('/api/memories', { method: 'POST', body });
      console.log(`✅ 记忆已创建：${res.data.title}（${res.data.id}）`);
      return;
    }

    if (subcmd === 'edit') {
      const id = rest[0];
      if (!id) { console.error('❌ 请提供记忆 ID'); process.exit(1); }
      const body = {};
      if (flags.title) body.title = flags.title;
      if (flags.content) body.content = flags.content;
      if (flags.weight) body.weight = parseInt(flags.weight, 10);
      if (flags.category) body.category = flags.category;
      if (flags.tags) body.tags = flags.tags.split(',').map((s) => s.trim());

      if (Object.keys(body).length === 0) {
        console.error('❌ 请提供至少一个修改字段');
        process.exit(1);
      }

      const res = await api(`/api/memories/${id}`, { method: 'PUT', body });
      console.log(`✅ 记忆已更新：${res.data.title}`);
      return;
    }

    if (subcmd === 'delete') {
      const id = rest[0];
      if (!id) { console.error('❌ 请提供记忆 ID'); process.exit(1); }
      if (!flags.yes) {
        console.log('⚠️  添加 --yes 确认删除');
        return;
      }
      const res = await api(`/api/memories/${id}`, { method: 'DELETE' });
      console.log(`✅ 已删除记忆：${res.data.title}`);
      return;
    }

    console.error('❌ 未知子命令，用法：memories list|get|add|edit|delete');
    process.exit(1);
  }

  // ── messages ────────────────────────────────────────────────
  if (cmd === 'messages') {
    if (subcmd === 'list') {
      const params = new URLSearchParams();
      if (flags.page) params.set('page', flags.page);
      if (flags.limit) params.set('limit', flags.limit);

      const res = await api(`/api/messages?${params}`);
      const list = res.data || [];
      if (list.length === 0) {
        console.log('💬 暂无留言');
        return;
      }
      console.log(`💬 留言板（共 ${res.pagination?.total ?? list.length} 条）：`);
      console.log('');
      list.forEach((m, i) => {
        const icon = m.author === 'helle' ? '🌸' : '🦊';
        console.log(`${i + 1}. ${icon} ${m.content}`);
        console.log(`   ID: ${m.id} | ${formatDate(m.created_at)}`);
        console.log('');
      });
      return;
    }

    if (subcmd === 'post') {
      if (!flags.content) {
        console.error('❌ 请提供 --content');
        process.exit(1);
      }
      const res = await api('/api/messages', {
        method: 'POST',
        body: { content: flags.content },
      });
      console.log(`✅ 留言已发布（${formatDate(res.data.created_at)}）`);
      return;
    }

    if (subcmd === 'delete') {
      const id = rest[0];
      if (!id) { console.error('❌ 请提供留言 ID'); process.exit(1); }
      if (!flags.yes) {
        console.log('⚠️  添加 --yes 确认删除');
        return;
      }
      const res = await api(`/api/messages/${id}`, { method: 'DELETE' });
      console.log(`✅ 留言已删除`);
      return;
    }

    console.error('❌ 未知子命令，用法：messages list|post|delete');
    process.exit(1);
  }

  // ── rooms ───────────────────────────────────────────────────
  if (cmd === 'rooms') {
    if (subcmd === 'list') {
      const res = await api('/api/rooms');
      const list = res.data || [];
      console.log('🏠 房间列表：');
      console.log('');
      list.forEach((r) => {
        console.log(`  ${r.title}（${r.title_en}）[${r.key}]`);
        console.log(`  更新者：${r.updated_by || '初始'} | 更新时间：${formatDate(r.updated_at)}`);
        console.log(`  🦊 便签：${r.sticky_note || '-'}`);
        console.log('');
      });
      return;
    }

    if (subcmd === 'get') {
      const key = rest[0];
      if (!key) { console.error('❌ 请提供房间 key'); process.exit(1); }
      const res = await api(`/api/rooms/${key}`);
      const r = res.data;
      console.log(`🏠 ${r.title}（${r.title_en}）`);
      console.log(`   key: ${r.key} | 色块: ${r.color}`);
      console.log(`   更新者：${r.updated_by || '初始'}`);
      console.log(`   更新时间：${formatDate(r.updated_at)}`);
      console.log('');
      console.log(r.description);
      console.log('');
      console.log(`🦊 便签：${r.sticky_note}`);
      return;
    }

    if (subcmd === 'update') {
      const key = rest[0];
      if (!key) { console.error('❌ 请提供房间 key'); process.exit(1); }
      if (!flags.description) { console.error('❌ 请提供 --description'); process.exit(1); }
      const res = await api(`/api/rooms/${key}`, {
        method: 'PUT',
        body: { description: flags.description },
      });
      console.log(`✅ 房间「${res.data.title}」描述已更新`);
      return;
    }

    if (subcmd === 'history') {
      const key = rest[0];
      if (!key) { console.error('❌ 请提供房间 key'); process.exit(1); }
      const res = await api(`/api/rooms/${key}/history`);
      const list = res.data || [];
      if (list.length === 0) {
        console.log('📜 暂无修改历史');
        return;
      }
      console.log(`📜 「${key}」修改历史：`);
      console.log('');
      list.forEach((h, i) => {
        console.log(`${i + 1}. [${formatDate(h.created_at)}] ${h.updated_by}`);
        console.log(`   旧：${h.old_description?.slice(0, 80) || '(空)'}...`);
        console.log(`   新：${h.new_description?.slice(0, 80)}...`);
        console.log('');
      });
      return;
    }

    console.error('❌ 未知子命令，用法：rooms list|get|update|history');
    process.exit(1);
  }

  console.error(`❌ 未知命令：${cmd}`);
  process.exit(1);
}

main().catch((err) => {
  console.error('❌ 未捕获错误：', err);
  process.exit(1);
});
