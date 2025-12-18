import React, { useEffect, useState } from 'react';
import { Copy, Check, Download, FileText, Database, WifiOff, Loader2 } from 'lucide-react';
import { AppConfig, CustomLink, RepoFile } from '../types';
import { fetchRepoDir } from '../services/githubService';

interface PublicHomeProps {
  config: AppConfig;
  sources: string[];
  customLinks: CustomLink[];
}

const STORAGE_KEY_FILES = 'clashhub_cached_files';

export const PublicHome: React.FC<PublicHomeProps> = ({ config, sources, customLinks }) => {
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isError, setIsError] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY_FILES);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0) {
          setRepoFiles(parsed);
          setIsFromCache(true);
        }
      } catch (e) {}
    }

    if (config.repoOwner && config.repoName) {
      loadContent();
    }
  }, [config.repoOwner, config.repoName]);

  const loadContent = async () => {
    setIsLoading(true);
    setIsError(false);
    
    try {
      const files = await fetchRepoDir(config, 'clash');
      
      if (files === null || (Array.isArray(files) && files.length === 0)) {
        await probeKnownFiles();
      } else {
        const subFiles = files.filter(f => 
          (f.name.endsWith('.yaml') || f.name.endsWith('.yml')) && f.type === 'file'
        );
        setRepoFiles(subFiles);
        setIsFromCache(false);
        setIsError(false);
        localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(subFiles));
      }

    } catch (e: any) {
      console.error("Content load failed", e);
      if (repoFiles.length === 0) setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const probeKnownFiles = async () => {
    const knownNames = [
      'Neat_config1.yml', 'Neat_config2.yml', 'Neat_config3.yml', 
      'Neat_config4.yml', 'Neat_config5.yml', 'Neat_config6.yml', 'Neat_config7.yml'
    ];
    const found: RepoFile[] = [];
    await Promise.all(knownNames.map(async (name) => {
      const url = `https://raw.githubusercontent.com/${config.repoOwner}/${config.repoName}/main/clash/${name}`;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) found.push({ name, sha: name, size: 0 } as any);
      } catch (e) {}
    }));

    if (found.length > 0) {
      setRepoFiles(found);
      setIsFromCache(false);
      setIsError(false);
    } else if (repoFiles.length === 0) {
      setIsError(true);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const isUrl = (str: string) => {
    try { return str.startsWith('http'); } catch (e) { return false; }
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-12 animate-fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
          Clash Subscription Hub
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">
          高速、稳定、精简的 Clash 配置订阅托管。
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between pl-1">
          <h3 className="text-xl font-bold opacity-90 flex items-center gap-2 text-gray-800 dark:text-gray-100">
            订阅列表 ({repoFiles.length})
            {isFromCache && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1"><Database className="w-3 h-3" /> 离线数据</span>}
          </h3>
        </div>

        <div className="grid gap-4">
          {isError && repoFiles.length === 0 && (
            <div className="text-center py-12 border border-dashed border-red-200 dark:border-red-900/30 rounded-2xl bg-red-50/50 dark:bg-red-900/10">
              <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 font-bold text-lg">内容加载受限</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 px-8 max-w-md mx-auto">
                GitHub 官方 API 限制了访问。请尝试在后台设置您的 Token。
              </p>
            </div>
          )}

          {isLoading && repoFiles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-gray-500 font-bold">正在获取订阅文件...</p>
            </div>
          )}

          {repoFiles.map((file, index) => {
            // 核心逻辑：主页显示及复制均使用用户自定义域名
            const displayDomain = config.customDomain || "https://clash.fastkj.eu.org";
            const subUrl = `${displayDomain.replace(/\/$/, '')}/clash/${file.name}`;

            const isCopied = copiedIndex === index;

            return (
              <div key={file.name} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-2xl bg-white dark:bg-night-card shadow-sm border border-gray-100 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500/50 transition-all duration-300">
                <div className="flex-1 min-w-0 mr-4 mb-4 sm:mb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-bold text-gray-800 dark:text-gray-200 text-lg">{file.name}</span>
                  </div>
                  <p className="text-sm font-mono break-all text-blue-600/70 dark:text-blue-400/70 bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-lg border border-blue-100/50 dark:border-blue-800/50 select-all">
                    {subUrl}
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => handleCopy(subUrl, index)} 
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 ${
                      isCopied 
                        ? 'bg-green-600 text-white' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                    }`}
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isCopied ? '复制成功' : '复制订阅'}
                  </button>
                  <a 
                    href={subUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-100 dark:border-gray-800 transition-all shadow-sm"
                    title="预览内容"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 快捷导航部分 - 增强 UI */}
      {customLinks.length > 0 && (
        <section className="space-y-6">
          <h3 className="text-xl font-bold opacity-90 pl-1 text-gray-800 dark:text-gray-100">快捷入口</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {customLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center p-6 rounded-3xl bg-white dark:bg-night-card border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500"
                style={{ borderColor: link.color ? `${link.color}44` : undefined }}
              >
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl shadow-lg overflow-hidden transition-transform duration-500 group-hover:rotate-12 bg-white dark:bg-black/20"
                  style={{ backgroundColor: isUrl(link.icon || '') ? 'white' : (link.color || '#3b82f6'), color: '#fff' }}
                >
                  {link.icon && isUrl(link.icon) ? (
                    <img src={link.icon} alt={link.name} className="w-12 h-12 object-contain" />
                  ) : (
                    <span>{link.icon || '🔗'}</span>
                  )}
                </div>
                <span className="font-bold text-sm text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {link.name}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};