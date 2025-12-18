import React, { useEffect, useState } from 'react';
import { Copy, Check, Download, FileText, Database } from 'lucide-react';
import { AppConfig, CustomLink, RepoFile } from '../types';
import { fetchCustomLinks, fetchRepoDir } from '../services/githubService';

interface PublicHomeProps {
  config: AppConfig;
  sources: string[];
}

const STORAGE_KEY_FILES = 'clashhub_cached_files';

export const PublicHome: React.FC<PublicHomeProps> = ({ config, sources }) => {
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    // 初始加载：尝试从缓存读取，让界面秒开
    const cached = localStorage.getItem(STORAGE_KEY_FILES);
    if (cached) {
      try {
        setRepoFiles(JSON.parse(cached));
        setIsFromCache(true);
      } catch (e) {}
    }

    if (config.repoOwner && config.repoName) {
      loadContent();
    }
  }, [config.repoOwner, config.repoName, config.githubToken]);

  const loadContent = async () => {
    setIsLoading(true);
    
    try {
      // 获取自定义链接
      const links = await fetchCustomLinks(config);
      if (links && Array.isArray(links)) setCustomLinks(links);

      // 获取订阅文件列表
      const files = await fetchRepoDir(config, 'clash');
      
      if (files === null) {
        // 说明触发了 API 限制或请求失败，此时我们什么都不做，保持已有的（可能是缓存的）列表
        console.log("GitHub API Rate Limited. Using local cache.");
        setIsFromCache(true);
      } else {
        const subFiles = files.filter(f => 
          (f.name.endsWith('.yaml') || f.name.endsWith('.yml')) && 
          f.type === 'file'
        );
        setRepoFiles(subFiles);
        setIsFromCache(false);
        // 更新缓存
        localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(subFiles));
      }

    } catch (e: any) {
      console.error("Content load failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-12 animate-fade-in">
      
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
          Clash Subscription Hub
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          高速、稳定、精简的 Clash 配置订阅托管。
        </p>
      </div>

      {/* 订阅列表部分 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pl-1">
          <h3 className="text-xl font-semibold opacity-80 flex items-center gap-2">
            订阅列表 ({repoFiles.length})
            {isFromCache && (
              <span className="flex items-center gap-1 text-[10px] font-normal px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-400" title="API 限制中，正在显示本地缓存的数据">
                <Database className="w-3 h-3" /> 缓存模式
              </span>
            )}
            <span className="ml-auto text-xs font-normal text-gray-400 hidden sm:inline">来自 {config.repoOwner}/{config.repoName}</span>
          </h3>
        </div>

        <div className="grid gap-4">
          {repoFiles.length === 0 && !isLoading && (
            <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              <p className="text-gray-500 font-medium">暂无数据</p>
              <p className="text-sm text-gray-400 mt-2">系统将自动尝试获取，或在后台检查配置。</p>
            </div>
          )}

          {isLoading && repoFiles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-400">正在同步最新配置...</p>
            </div>
          )}

          {repoFiles.map((file, index) => {
            let subUrl = config.customDomain 
              ? `${config.customDomain.replace(/\/$/, '')}/clash/${file.name}`
              : `https://cdn.jsdelivr.net/gh/${config.repoOwner}/${config.repoName}@main/clash/${file.name}`;

            const isCopied = copiedIndex === index;

            return (
              <div 
                key={file.sha || file.name} 
                className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-day-card dark:bg-night-card shadow-sm border border-gray-200 dark:border-gray-800 hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all duration-300"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                    <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <p className="text-sm font-mono truncate text-gray-500 dark:text-gray-400 select-all">{subUrl}</p>
                </div>

                <div className="flex items-center gap-2 mt-3 sm:mt-0">
                  <button
                    onClick={() => handleCopy(subUrl, index)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isCopied 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isCopied ? '已复制' : '复制链接'}
                  </button>
                  <a
                    href={subUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-400 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 快捷导航部分 */}
      {customLinks.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold opacity-80 pl-1">快捷导航</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {customLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 rounded-xl bg-day-card dark:bg-night-card border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
                style={{ borderColor: link.color ? `${link.color}40` : undefined }}
              >
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3 text-2xl shadow-inner transition-transform group-hover:scale-110"
                  style={{ backgroundColor: link.color || '#3b82f6', color: '#fff' }}
                >
                  {link.icon ? (
                    link.icon.startsWith('http') ? <img src={link.icon} className="w-8 h-8 object-contain" /> : <span>{link.icon}</span>
                  ) : (
                    <FileText className="w-6 h-6" />
                  )}
                </div>
                <span className="font-medium text-center text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
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