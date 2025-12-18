import { AppConfig, CustomLink, RepoFile } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Helper to convert content to Base64 (UTF-8 safe)
 */
function toBase64(str: string): string {
  return window.btoa(unescape(encodeURIComponent(str)));
}

/**
 * Helper to decode Base64 (UTF-8 safe)
 */
function fromBase64(str: string): string {
  return decodeURIComponent(escape(window.atob(str)));
}

/**
 * Fetch a raw file from any URL with Proxy Fallback.
 */
export const fetchRawContent = async (url: string): Promise<string> => {
  let targetUrl = url;
  
  if (url.includes('github.com') && url.includes('/blob/')) {
    targetUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }

  try {
    const response = await fetch(targetUrl);
    if (response.ok) return await response.text();
    if (response.status === 404) throw new Error(`404 Not Found: ${targetUrl}`);
  } catch (error: any) {
    if (error.message.includes('404')) throw error;
  }

  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`Proxy Fetch Failed: ${response.statusText}`);
    return await response.text();
  } catch (error) {
    throw new Error(`Failed to fetch source content.`);
  }
};

/**
 * Get contents of a directory in the repo
 */
export const fetchRepoDir = async (config: AppConfig, path: string): Promise<RepoFile[] | null> => {
  if (!config.repoOwner || !config.repoName) return [];
  
  const url = `${GITHUB_API_BASE}/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;
  
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };

  if (config.githubToken) {
    headers['Authorization'] = `token ${config.githubToken}`;
  }

  try {
    const response = await fetch(url, { headers, cache: 'no-cache' });

    if (!response.ok) {
      if (response.status === 403) {
        // Rate limit hit - return null to signal UI to use cache
        return null;
      }
      if (response.status === 404) return [];
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return null;
  }
};

/**
 * Get file SHA and Content.
 */
export const getRepoFile = async (config: AppConfig, path: string) => {
  if (!config.repoOwner || !config.repoName) return null;

  const url = `${GITHUB_API_BASE}/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;
  
  const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
  if (config.githubToken) headers['Authorization'] = `token ${config.githubToken}`;
  
  try {
    const response = await fetch(url, { headers, cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) return null;

    const data = await response.json();
    return {
      sha: data.sha,
      content: fromBase64(data.content),
    };
  } catch (e) {
    return null;
  }
};

export const uploadToRepo = async (config: AppConfig, path: string, content: string, message: string, sha?: string) => {
  if (!config.repoOwner || !config.repoName || !config.githubToken) {
    throw new Error("配置缺失。");
  }

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
    throw new Error(`上传失败: ${errData.message || response.statusText}`);
  }
  return await response.json();
};

export const saveCustomLinks = async (config: AppConfig, links: CustomLink[]) => {
  const path = 'clash/link.json';
  const currentFile = await getRepoFile(config, path);
  const content = JSON.stringify(links, null, 2);
  await uploadToRepo(config, path, content, `Update links ${new Date().toISOString()}`, currentFile?.sha);
};

export const fetchCustomLinks = async (config: AppConfig): Promise<CustomLink[]> => {
  const path = 'clash/link.json';
  if (!config.repoOwner || !config.repoName) return [];
  
  const publicUrl = `https://raw.githubusercontent.com/${config.repoOwner}/${config.repoName}/main/${path}`;
  try {
    const res = await fetch(publicUrl, { cache: 'no-cache' });
    if (res.ok) return await res.json();
  } catch (e) {}

  try {
    const file = await getRepoFile(config, path);
    if (file) return JSON.parse(file.content);
  } catch (e) {}

  return [];
};