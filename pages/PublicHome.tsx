import React, { useEffect, useState } from 'react';
import { Copy, Check, Download, FileText, Database, WifiOff, Loader2, AlertCircle } from 'lucide-react';
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
  const [isError, setIsError] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    // 1. 优先显示缓存数据，让首屏几乎秒开
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
      // 尝试获取链接
      fetchCustomLinks(config).then(links => {
        if (links && links.length) setCustomLinks(links);
      });

      // 尝试获取目录列表
      const files = await fetchRepoDir(config, 'clash');
      
      if (files === null || files.length === 0) {
        // 如果 API/代理 全部失败或返回空，执行“暴力嗅探”探测现有文件
        console.warn("Listing failed, falling back to probing known filenames...");
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

  /**
   * 暴力探测：即便 GitHub API 被封，也尝试探测默认规则命名的文件
   */
  const probeKnownFiles = async () => {
    const knownNames = [
      'Neat_config1.yml', 'Neat_config2.yml', 'Neat_config3.yml', 
      'Neat_config4.yml', 'Neat_config5.yml', 'Neat_config6.yml'
    ];
    
    const found: RepoFile[] = [];
    
    // 并发检查文件是否存在
    await Promise.all(knownNames.map(async (name) => {
      const url = `https://raw.githubusercontent.com/${config.repoOwner}/${config.repoName}/main/clash/${name}`;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) {
          found.push({ name, sha: name, size: 0 } as any);
        }
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

      <section className="space-y-4">
        <div className="flex items-center justify-between pl-1">
          <h3 className="text-xl font-semibold opacity-80 flex items-center gap-2">
            订阅列表 ({repoFiles.length})
            {isFromCache && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center gap-1"><Database className="w-3 h-3" /> 离线数据</span>}
          </h3>
        </div>

        <div className="grid gap-4">
          {isError && repoFiles.length === 0 && (
            <div className="text-center py-12 border border-dashed border-red-200 dark:border-red-900/30 rounded-2xl bg-red-50/50 dark:bg-red-900/10">
              <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 font-bold text-lg">内容加载受限</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 px-8 max-w-md mx-auto">
                GitHub 官方 API 限制了公共访问。我们已尝试通过多重代理获取，但依然无法读取列表。请稍后刷新，或点击右上角设置您的 Token。
              </p>
              <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                刷新重试
              </button>
            </div>
          )}

          {isLoading && repoFiles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-gray-500 font-medium">正在通过多重代理获取订阅文件...</p>
            </div>
          )}

          {repoFiles.map((file, index) => {
            const subUrl = config.customDomain 
              ? `${config.customDomain.replace(/\/$/, '')}/clash/${file.name}`
              : `https://cdn.jsdelivr.net/gh/${config.repoOwner}/${config.repoName}@main/clash/${file.name}`;

            const isCopied = copiedIndex === index;

            return (
              <div 
                key={file.name} 
                className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl bg-white dark:bg-night-card shadow-sm border border-gray-100 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500/50 transition-all"
              >
                <div className="flex-1 min-w-0 mr-4 mb-4 sm:mb-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-gray-800 dark:text-gray-200">{file.name}</span>
                  </div>
                  <p className="text-xs font-mono break-all text-gray-400 dark:text-gray-500">{subUrl}</p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleCopy(subUrl, index)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isCopied 
                        ? 'bg-green-600 text-white' 
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white'
                    }`}
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isCopied ? '成功' : '复制链接'}
                  </button>
                  <a
                    href={subUrl}
                    download
                    className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 快捷按钮 */}
      {customLinks.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold opacity-80 pl-1">快捷导航</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {customLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center p-5 rounded-2xl bg-white dark:bg-night-card border border-gray-100 dark:border-gray-800 shadow-sm hover:-translate-y-1 transition-all"
                style={{ borderColor: link.color ? `${link.color}33` : undefined }}
              >
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3 text-2xl shadow-sm"
                  style={{ backgroundColor: link.color || '#3b82f6', color: '#fff' }}
                >
                  {link.icon || '🔗'}
                </div>
                <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{link.name}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};