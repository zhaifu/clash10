import { AppConfig, CustomLink, RepoFile } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * 字符转换工具
 */
function toBase64(str: string): string {
  return window.btoa(unescape(encodeURIComponent(str)));
}

function fromBase64(str: string): string {
  return decodeURIComponent(escape(window.atob(str)));
}

/**
 * 通用内容获取（带代理重试）
 */
export const fetchRawContent = async (url: string): Promise<string> => {
  let targetUrl = url;
  if (url.includes('github.com') && url.includes('/blob/')) {
    targetUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }

  // 1. 直接尝试
  try {
    const response = await fetch(targetUrl);
    if (response.ok) return await response.text();
  } catch (e) {}

  // 2. 代理尝试
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
  ];

  for (const proxy of proxies) {
    try {
      const response = await fetch(proxy);
      if (response.ok) return await response.text();
    } catch (e) {}
  }

  throw new Error(`无法获取内容: ${url}`);
};

/**
 * 获取目录列表（核心修复：多重代理回退）
 */
export const fetchRepoDir = async (config: AppConfig, path: string): Promise<RepoFile[] | null> => {
  if (!config.repoOwner || !config.repoName) return [];
  
  const apiUrl = `${GITHUB_API_BASE}/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;
  const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
  if (config.githubToken) headers['Authorization'] = `token ${config.githubToken}`;

  // 1. 尝试直接请求 API
  try {
    const response = await fetch(apiUrl, { headers, cache: 'no-cache' });
    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {}

  // 2. 尝试代理 A: AllOrigins
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const wrapper = await response.json();
      const data = JSON.parse(wrapper.contents);
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}

  // 3. 尝试代理 B: CORSProxy.io
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}

  // 4. 极端情况：如果 API 列表完全挂了，返回 null 触发 PublicHome 的“强制嗅探”机制
  return null;
};

/**
 * 获取单个文件
 */
export const getRepoFile = async (config: AppConfig, path: string) => {
  if (!config.repoOwner || !config.repoName) return null;
  const url = `${GITHUB_API_BASE}/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;
  const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
  if (config.githubToken) headers['Authorization'] = `token ${config.githubToken}`;
  
  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      const data = await response.json();
      return { sha: data.sha, content: fromBase64(data.content) };
    }
  } catch (e) {}
  return null;
};

/**
 * 上传/同步文件
 */
export const uploadToRepo = async (config: AppConfig, path: string, content: string, message: string, sha?: string) => {
  const url = `${GITHUB_API_BASE}/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;
  const body: any = { message, content: toBase64(content) };
  if (sha) body.sha = sha;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${config.githubToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "上传失败");
  }
  return await response.json();
};

export const saveCustomLinks = async (config: AppConfig, links: CustomLink[]) => {
  const path = 'clash/link.json';
  const currentFile = await getRepoFile(config, path);
  await uploadToRepo(config, path, JSON.stringify(links, null, 2), `Update links ${Date.now()}`, currentFile?.sha);
};

export const fetchCustomLinks = async (config: AppConfig): Promise<CustomLink[]> => {
  if (!config.repoOwner || !config.repoName) return [];
  const path = 'clash/link.json';
  const publicUrl = `https://raw.githubusercontent.com/${config.repoOwner}/${config.repoName}/main/${path}`;
  
  try {
    const res = await fetch(publicUrl);
    if (res.ok) return await res.json();
  } catch (e) {}
  
  const file = await getRepoFile(config, path);
  return file ? JSON.parse(file.content) : [];
};