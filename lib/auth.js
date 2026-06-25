/**
 * 双Key鉴权工具
 * - Authorization: Bearer <HELLE_API_KEY> → 'helle'
 * - X-CLI-Key: <KRUGER_CLI_KEY>         → 'kruger'
 * - 都不匹配 → null
 */

const HELLE_API_KEY = process.env.HELLE_API_KEY;
const KRUGER_CLI_KEY = process.env.KRUGER_CLI_KEY;

function identifyAuthor(req) {
  // 检查 Helle 前端 Key
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token === HELLE_API_KEY) {
      return 'helle';
    }
  }

  // 检查 Kruger CLI Key
  const cliKey = req.headers['x-cli-key'];
  if (cliKey && cliKey === KRUGER_CLI_KEY) {
    return 'kruger';
  }

  return null;
}

module.exports = { identifyAuthor };
