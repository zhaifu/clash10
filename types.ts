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

export interface SourceMap {
  id: string;
  sourceUrl: string; // The external raw Github URL
  targetFilename: string; // e.g., Neat_config1.yml
}

// Default source list based on user request
export const DEFAULT_SOURCES: string[] = [
  "https://github.com/dongchengjie/airport/blob/main/subs/merged/merged.yaml",
  "https://github.com/snakem982/proxypool/blob/main/source/clash-meta.yaml",
  "https://github.com/snakem982/proxypool/blob/main/source/clash-meta-2.yaml",
  "https://github.com/Barabama/FreeNodes/blob/main/nodes/nodefree.yaml",
  "https://github.com/Barabama/FreeNodes/blob/main/nodes/v2rayshare.yaml",
  "https://github.com/Barabama/FreeNodes/blob/main/nodes/ndnode.yaml",
  "https://github.com/dongchengjie/airport/blob/main/config.yaml"
];

export const DEFAULT_DOMAIN = "https://clash.fastkj.eu.org";