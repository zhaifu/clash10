import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PublicHome } from './pages/PublicHome';
import { AdminDashboard } from './pages/AdminDashboard';
import { AppConfig, DEFAULT_SOURCES, DEFAULT_DOMAIN, DEFAULT_OWNER, DEFAULT_REPO } from './types';

// Storage Keys - Bumped version to reset defaults for user
const STORAGE_CONFIG = 'clashhub_config_v2';
const STORAGE_SOURCES = 'clashhub_sources_v2';

const App: React.FC = () => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // App State - Initialize with DEFAULTS so the homepage works immediately in read-only mode
  const [config, setConfig] = useState<AppConfig>({
    githubToken: '', // Token remains empty until login
    repoOwner: DEFAULT_OWNER,
    repoName: DEFAULT_REPO,
    customDomain: DEFAULT_DOMAIN
  });

  const [sources, setSources] = useState<string[]>(DEFAULT_SOURCES);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_CONFIG);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // Merge saved config with defaults to ensure we always have a repo
        setConfig(prev => ({
          ...prev,
          ...parsed,
          repoOwner: parsed.repoOwner || DEFAULT_OWNER,
          repoName: parsed.repoName || DEFAULT_REPO
        }));
      } catch (e) {
        console.error("Failed to parse config", e);
      }
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