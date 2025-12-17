import { AppConfig, CustomLink } from '../types';

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
 * 1. Tries to convert GitHub blob URLs to raw.githubusercontent.com.
 * 2. Attempts direct fetch.
 * 3. If direct fetch fails (CORS/Network), tries via a CORS proxy.
 */
export const fetchRawContent = async (url: string): Promise<string> => {
  let targetUrl = url;
  
  // Basic conversion from github.com/user/repo/blob/branch/file to raw.githubusercontent.com/user/repo/branch/file
  if (url.includes('github.com') && url.includes('/blob/')) {
    targetUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }

  // Attempt 1: Direct Fetch
  try {
    const response = await fetch(targetUrl);
    if (response.ok) {
      return await response.text();
    }
    // If it's a 404, a proxy won't help, so throw immediately to skip proxy
    if (response.status === 404) {
      throw new Error(`404 Not Found: ${targetUrl}`);
    }
  } catch (error: any) {
    if (error.message.includes('404')) throw error;
    console.warn(`Direct fetch failed for ${targetUrl}, attempting proxy fallback...`, error);
  }

  // Attempt 2: CORS Proxy (AllOrigins)
  try {
    // We use api.allorigins.win as a free CORS proxy
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Proxy Fetch Failed: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`All fetch attempts failed for ${url}`, error);
    throw new Error(`Failed to fetch source after proxy attempt. Please check if the URL is valid and public.`);
  }
};

/**
 * Get file SHA (needed for updates) and Content from the user's repo
 */
export const getRepoFile = async (config: AppConfig, path: string) => {
  const url = `${GITHUB_API_BASE}/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${config.githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
    cache: 'no-store' 
  });

  if (response.status === 404) {
    return null; // File doesn't exist
  }

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    sha: data.sha,
    content: fromBase64(data.content),
  };
};

/**
 * Create or Update a file in the user's repo
 */
export const uploadToRepo = async (
  config: AppConfig,
  path: string,
  content: string,
  message: string,
  sha?: string
) => {
  const url = `${GITHUB_API_BASE}/repos/${config.repoOwner}/${config.repoName}/contents/${path}`;
  
  const body: any = {
    message,
    content: toBase64(content),
  };

  if (sha) {
    body.sha = sha;
  }

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
    const errData = await response.json();
    throw new Error(`Upload Failed: ${errData.message || response.statusText}`);
  }

  return await response.json();
};

/**
 * High-level function to save custom links to link.json
 */
export const saveCustomLinks = async (config: AppConfig, links: CustomLink[]) => {
  const path = 'clash/link.json';
  const currentFile = await getRepoFile(config, path);
  const content = JSON.stringify(links, null, 2);
  
  await uploadToRepo(
    config,
    path,
    content,
    `Update custom links ${new Date().toISOString()}`,
    currentFile?.sha
  );
};

/**
 * High-level function to fetch custom links from the repo (publicly or privately)
 */
export const fetchCustomLinks = async (config: AppConfig): Promise<CustomLink[]> => {
  const path = 'clash/link.json';
  try {
    // Try via API first if token exists (more reliable for fresh data)
    if (config.githubToken && config.repoOwner && config.repoName) {
        const file = await getRepoFile(config, path);
        if (file) return JSON.parse(file.content);
        return [];
    } else {
        // Fallback to public raw URL if configured, otherwise return empty
        if(config.repoOwner && config.repoName) {
             const publicUrl = `https://raw.githubusercontent.com/${config.repoOwner}/${config.repoName}/main/${path}`;
             const res = await fetch(publicUrl);
             if(res.ok) return await res.json();
        }
        return [];
    }
  } catch (e) {
    console.warn("Could not fetch custom links (this is normal if the file doesn't exist yet):", e);
    return [];
  }
};