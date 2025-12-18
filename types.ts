export interface AppConfig {
  githubToken: string;
  repoOwner: string;
  repoName: string;
  customDomain: string; // e.g., https://clash.fastkj.eu.org
}

export interface CustomLink {
  id: string;
  name: string;
  url: string;
  icon?: string; // 图标 URL 或表情符号
  color: string;
}

export interface RepoFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file' | 'dir';
}

export interface SourceMap {
  id: string;
  sourceUrl: string; // 外部 Github 原始 URL
  targetFilename: string; // 例如: Neat_config1.yml
}

// 默认的公开读取权限仓库
export const DEFAULT_OWNER = "dongchengjie";
export const DEFAULT_REPO = "airport";

// 用户请求的初始源列表
export const DEFAULT_SOURCES: string[] = [];

export const DEFAULT_DOMAIN = "";