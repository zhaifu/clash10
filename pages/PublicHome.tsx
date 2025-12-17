import React, { useEffect, useState } from 'react';
import { Copy, Check, Download, ExternalLink, RefreshCw, FileText, AlertTriangle } from 'lucide-react';
import { AppConfig, CustomLink, RepoFile, DEFAULT_DOMAIN } from '../types';
import { fetchCustomLinks, fetchRepoDir } from '../services/githubService';

interface PublicHomeProps {
  config: AppConfig;
  sources: string[];
}

export const PublicHome: React.FC<PublicHomeProps> = ({ config, sources }) => {
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const domain = config.customDomain || DEFAULT_DOMAIN;

  // Load Content
  useEffect(() => {
    // Attempt to load content immediately if we have repo details (which we now have by default)
    if (config.repoOwner && config.repoName) {
      loadContent();
    }
  }, [config.repoOwner, config.repoName, config.githubToken]); // Reload if config changes

  const loadContent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Custom Links (link.json)
      // We don't block the UI if this fails
      fetchCustomLinks(config).then(links => {
         if (links && Array.isArray(links)) setCustomLinks(links);
      });

      // 2. Fetch Subscription Files in /clash directory
      const files = await fetchRepoDir(config, 'clash');
      
      // Filter for valid YAML/YML files
      const subFiles = files.filter(f => 
        (f.name.endsWith('.yaml') || f.name.endsWith('.yml')) && 
        f.type === 'file'
      );
      setRepoFiles(subFiles);

    } catch (e: any) {
      console.error("Failed to load content", e);
      // Clean up the error message for display
      const msg = e.message || "无法加载订阅文件列表。";
      setError(msg);
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
      
      {/* Intro Section */}
      <div className="text-center space-y-4 relative">
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
          Clash Subscription Hub
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          高速、稳定、精简的 Clash 配置订阅托管。
        </p>
        <button 
          onClick={loadContent} 
          className="absolute top-0 right-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-400"
          title="刷新列表"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Subscription List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pl-1">
          <h3 className="text-xl font-semibold opacity-80">
            订阅列表 ({repoFiles.length})
            <span className="ml-2 text-xs font-normal text-gray-400">来自 {config.repoOwner}/{config.repoName}</span>
          </h3>
        </div>

        {error && (
           <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
             <AlertTriangle className="w-5 h-5 flex-shrink-0" />
             <span>{error}</span>
           </div>
        )}

        <div className="grid gap-4">
          {repoFiles.length === 0 && !isLoading && !error && (
            <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              <p className="text-gray-500 font-medium">暂无订阅文件</p>
              <p className="text-sm text-gray-400 mt-2">请确认仓库 {config.repoOwner}/{config.repoName} 中存在 `clash` 文件夹且包含 .yaml 文件。</p>
            </div>
          )}

          {repoFiles.map((file, index) => {
            // Construct the subscription URL
            let subUrl = '';
            if (config.customDomain && config.customDomain.startsWith('http')) {
              const baseUrl = config.customDomain.replace(/\/$/, '');
              subUrl = `${baseUrl}/clash/${file.name}`;
            } else {
               // Fallback to jsDelivr
               subUrl = `https://cdn.jsdelivr.net/gh/${config.repoOwner}/${config.repoName}@main/clash/${file.name}`;
            }

            const isCopied = copiedIndex === index;

            return (
              <div 
                key={file.sha} 
                className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-day-card dark:bg-night-card shadow-sm border border-gray-200 dark:border-gray-800 hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all duration-300"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                    <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <p className="text-sm sm:text-base font-mono truncate text-gray-500 dark:text-gray-400 select-all" title={subUrl}>
                    {subUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
                  <button
                    onClick={() => handleCopy(subUrl, index)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
                    className="flex-none p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Custom Buttons / Shortcuts */}
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
                    link.icon.startsWith('http') ? (
                       <img src={link.icon} alt="" className="w-8 h-8 object-contain" />
                    ) : (
                       <span>{link.icon}</span>
                    )
                  ) : (
                    <ExternalLink className="w-6 h-6" />
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