
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PublicHome } from './pages/PublicHome';
import { AdminDashboard } from './pages/AdminDashboard';
import { AppConfig, DEFAULT_SOURCES, DEFAULT_DOMAIN, DEFAULT_OWNER, DEFAULT_REPO } from './types';

// Storage Keys - 使用版本号以在默认值更新时强制刷新部分配置
const STORAGE_CONFIG = 'clashhub_config_v3'; 
const STORAGE_SOURCES = 'clashhub_sources_v3';

const App: React.FC = () => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // App State - 使用默认值初始化，确保主页立即显示内容
  const [config, setConfig] = useState<AppConfig>({
    githubToken: '', 
    repoOwner: DEFAULT_OWNER,
    repoName: DEFAULT_REPO,
    customDomain: DEFAULT_DOMAIN
  });

  const [sources, setSources] = useState<string[]>(DEFAULT_SOURCES);

  // 从本地存储加载配置
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_CONFIG);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // 如果本地存的是旧的默认值或者为空，我们合并最新的默认值
        setConfig({
          ...parsed,
          repoOwner: parsed.repoOwner || DEFAULT_OWNER,
          repoName: parsed.repoName || DEFAULT_REPO
        });
      } catch (e) {
        console.error("Failed to parse config", e);
      }
    } else {
      // 如果完全没有存储，保持初始状态（即 DEFAULT_OWNER/DEFAULT_REPO）
    }

    const savedSources = localStorage.getItem(STORAGE_SOURCES);
    if (savedSources) {
      try {
        setSources(JSON.parse(savedSources));
      } catch (e) {
        console.error("Failed to parse sources", e);
      }
    }
  }, []);

  const handleConfigChange = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_CONFIG, JSON.stringify(newConfig));
  };

  const handleSourcesChange = (newSources: string[]) => {
    setSources(newSources);
    localStorage.setItem(STORAGE_SOURCES, JSON.stringify(newSources));
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header 
        onOpenAdmin={() => setIsAdminOpen(true)} 
        title={config.repoName ? `${config.repoName} Hub` : undefined}
      />
      
      <div className="flex-1">
        <PublicHome config={config} sources={sources} />
      </div>

      <footer className="py-6 text-center text-sm text-gray-500 border-t border-black/5 dark:border-white/5">
        <p>© {new Date().getFullYear()} Clash Config Hub. Powered by React & GitHub API.</p>
      </footer>

      {isAdminOpen && (
        <AdminDashboard 
          config={config} 
          onConfigChange={handleConfigChange}
          sources={sources}
          onSourcesChange={handleSourcesChange}
          onClose={() => setIsAdminOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
