import React, { useEffect, useState } from 'react';
import { Copy, Check, Download, ExternalLink } from 'lucide-react';
import { AppConfig, CustomLink, DEFAULT_SOURCES, DEFAULT_DOMAIN } from '../types';
import { fetchCustomLinks } from '../services/githubService';

interface PublicHomeProps {
  config: AppConfig;
  sources: string[];
}

export const PublicHome: React.FC<PublicHomeProps> = ({ config, sources }) => {
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Fetch custom buttons from link.json (if available)
  useEffect(() => {
    if (config.repoOwner && config.repoName) {
      fetchCustomLinks(config).then(setCustomLinks);
    }
  }, [config]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const domain = config.customDomain || DEFAULT_DOMAIN;
  // If sources list is empty in config (first load), use default length to show placeholders or default
  const sourceListToUse = sources.length > 0 ? sources : DEFAULT_SOURCES;

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-12 animate-fade-in">
      
      {/* Intro Section */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
          Clash Subscription Hub
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          高速、稳定、精简的 Clash 配置订阅托管。
        </p>
      </div>

      {/* Subscription List */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold opacity-80 pl-1">订阅列表</h3>
        <div className="grid gap-4">
          {sourceListToUse.map((_, index) => {
            const neatUrl = `${domain}/clash/Neat_config${index + 1}.yml`;
            const isCopied = copiedIndex === index;

            return (
              <div 
                key={index} 
                className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-day-card dark:bg-night-card shadow-sm border border-gray-200 dark:border-gray-800 hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all duration-300"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="font-medium text-sm text-gray-500 dark:text-gray-400">Config {index + 1}</span>
                  </div>
                  <p className="text-sm sm:text-base font-mono truncate text-gray-800 dark:text-gray-200" title={neatUrl}>
                    {neatUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
                  <button
                    onClick={() => handleCopy(neatUrl, index)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isCopied 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isCopied ? '已复制' : '复制'}
                  </button>
                  <a
                    href={neatUrl}
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
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3 text-2xl shadow-inner"
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
                <span className="font-medium text-center text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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