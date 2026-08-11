/**
 * Vercel 无服务函数共用的 GitHub 提交助手
 * 通过 GitHub Contents API 读写仓库文件(持久化, 无需额外数据库)
 * 需要环境变量: GITHUB_TOKEN (repo scope), GITHUB_REPO = "owner/repo"
 */

const REPO = process.env.GITHUB_REPO || 'dscaro88-debug/cheapalot';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN || '';

const API = 'https://api.github.com';

function authHeaders() {
  return {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'cheapalot-inventory-bot',
  };
}

/**
 * 读取仓库文件, 返回 { content(base64), sha } 或 null(不存在)
 */
async function getFile(pathInRepo) {
  const res = await fetch(`${API}/repos/${REPO}/contents/${pathInRepo}?ref=${BRANCH}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${pathInRepo} failed: ${res.status}`);
  const data = await res.json();
  return { content: data.content, sha: data.sha, decoded: Buffer.from(data.content, 'base64').toString('utf8') };
}

/**
 * 写入/更新仓库文件(文本)
 */
async function putFile(pathInRepo, contentUtf8, message, sha) {
  return putFileBase64(pathInRepo, Buffer.from(contentUtf8, 'utf8').toString('base64'), message, sha);
}

/**
 * 写入/更新仓库文件(已是 base64 的内容, 如二进制图片)
 */
async function putFileBase64(pathInRepo, contentBase64, message, sha) {
  const body = {
    message,
    content: contentBase64,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await fetch(`${API}/repos/${REPO}/contents/${pathInRepo}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub PUT ${pathInRepo} failed: ${res.status} ${t}`);
  }
  return res.json();
}

/**
 * 读取 JSON 文件, 不存在则返回 fallback
 */
async function readJson(pathInRepo, fallback) {
  try {
    const f = await getFile(pathInRepo);
    if (!f) return fallback;
    return JSON.parse(f.decoded);
  } catch (e) {
    return fallback;
  }
}

/**
 * 原子化更新 JSON 文件: 先读 sha, 再写回
 */
async function updateJson(pathInRepo, updater, message) {
  const f = await getFile(pathInRepo);
  const current = f ? JSON.parse(f.decoded) : (Array.isArray(updater([]) ) ? [] : {});
  const next = updater(current);
  await putFile(pathInRepo, JSON.stringify(next, null, 1), message, f ? f.sha : undefined);
  return next;
}

module.exports = { REPO, BRANCH, getFile, putFile, putFileBase64, readJson, updateJson };
