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
  icon?: string; // URL to icon or emoji
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
  sourceUrl: string; // The external raw Github URL
  targetFilename: string; // e.g., Neat_config1.yml
}

// Hardcoded defaults for public read-only access
export const DEFAULT_OWNER = "zhaifu";
export const DEFAULT_REPO = "clash10";

// Default source list based on user request (Cleared old sources)
export const DEFAULT_SOURCES: string[] = [];

export const DEFAULT_DOMAIN = "";