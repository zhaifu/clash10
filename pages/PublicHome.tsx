
import React, { useEffect, useState } from 'react';
import { Copy, Check, FileText, Database, WifiOff, Loader2 } from 'lucide-react';
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
  const [updateTime, setUpdateTime] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setUpdateTime(formatted);

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

  const isUrl = (str: string | undefined) => {
    if (!str) return false;
    return str.startsWith('http');
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-10 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black tracking-tight sm:text-5xl text-day-text dark:text-night-text">
          Clash节点分享
        </h2>
        <p className="text-xs sm:text-lg text-gray-400 dark:text-zinc-500 max-w-2xl mx-auto font-medium px-4">
          免费订阅 · 自动获取合并互联网上的公开节点。
        </p>
      </div>

      <section className="p-5 sm:p-8 rounded-[2rem] bg-day-card dark:bg-night-card border border-black/5 dark:border-white/5 shadow-xl relative overflow-hidden">
        <div className="space-y-5 sm:space-y-8 relative z-10">
          <div className="space-y-2 sm:space-y-4">
            <h3 className="text-lg sm:text-2xl font-black flex items-center gap-2 text-day-text dark:text-night-text">
              <span className="w-1 h-5 sm:h-7 bg-day-text dark:bg-night-text rounded-full inline-block"></span>
              快捷导航
            </h3>
            <div className="text-[9px] sm:text-xs font-bold text-gray-400 dark:text-zinc-500 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg inline-block border border-black/5 dark:border-white/5">
              更新：{updateTime}
            </div>
          </div>

          {customLinks.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {customLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center gap-3 p-2.5 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 border border-white/10 overflow-hidden"
                  style={{ 
                    backgroundColor: link.color || '#3b82f6',
                    color: '#fff'
                  }}
                >
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                  
                  {/* 图标容器：添加 p-1.5 留白，防止图标贴边 */}
                  <div className="w-8 h-8 sm:w-10 sm:h-10 p-1.5 rounded-xl flex items-center justify-center shrink-0 bg-white/20 backdrop-blur-md border border-white/20 shadow-sm relative z-10 overflow-hidden">
                    {link.icon && isUrl(link.icon) ? (
                      <img src={link.icon} alt={link.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="drop-shadow-lg text-sm sm:text-lg">{link.icon || '🔗'}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 relative z-10">
                    <span className="font-black text-xs sm:text-sm truncate block tracking-tight">
                      {link.name}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg sm:text-xl font-bold text-day-text dark:text-night-text flex items-center gap-2">
            节点订阅
            <span className="text-[10px] px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-full opacity-50">{repoFiles.length}</span>
            {isFromCache && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold inline-flex items-center gap-1"><Database className="w-2.5 h-2.5" /> 缓存</span>}
          </h3>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {isError && repoFiles.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-black/5 dark:border-white/5 rounded-3xl">
              <WifiOff className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-bold text-xs">数据获取异常，请稍后刷新</p>
            </div>
          )}

          {isLoading && repoFiles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-6 h-6 text-day-text dark:text-night-text animate-spin opacity-50" />
              <p className="text-gray-400 font-bold text-[10px] sm:text-xs">加载订阅列表中...</p>
            </div>
          )}

          {repoFiles.map((file, index) => {
            const displayDomain = config.customDomain || "https://clash.fastkj.eu.org";
            const subUrl = `${displayDomain.replace(/\/$/, '')}/clash/${file.name}`;
            const isCopied = copiedIndex === index;

            return (
              <div key={file.name} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-day-card dark:bg-night-card shadow-sm border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/20 transition-all duration-300 group">
                <div className="flex-1 min-w-0 w-full sm:mr-4 mb-3 sm:mb-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText className="w-4 h-4 text-gray-400 group-hover:text-day-text dark:group-hover:text-night-text transition-colors" />
                    <span className="font-black text-day-text dark:text-night-text text-sm sm:text-lg truncate">{file.name}</span>
                  </div>
                  <p className="text-[9px] sm:text-[11px] font-mono break-all text-gray-400 bg-black/5 dark:bg-white/5 p-2 sm:p-3 rounded-xl select-all border border-black/5 dark:border-white/5 group-hover:border-black/10 transition-colors">
                    {subUrl}
                  </p>
                </div>
                <div className="w-full sm:w-auto">
                  <button 
                    onClick={() => handleCopy(subUrl, index)} 
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 sm:px-10 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl text-[11px] sm:text-sm font-black transition-all shadow-sm ${
                      isCopied 
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' 
                        : 'bg-day-text dark:bg-night-text text-day-bg dark:text-night-bg hover:shadow-lg hover:-translate-y-0.5 active:scale-95'
                    }`}
                  >
                    {isCopied ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Copy className="w-3 h-3 sm:w-4 sm:h-4" />}
                    {isCopied ? '已复制' : '复制订阅'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};
