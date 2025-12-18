import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PublicHome } from './pages/PublicHome';
import { AdminDashboard } from './pages/AdminDashboard';
import { AppConfig, CustomLink, DEFAULT_SOURCES, DEFAULT_DOMAIN, DEFAULT_OWNER, DEFAULT_REPO } from './types';
import { fetchCustomLinks } from './services/githubService';

// Storage Keys
const STORAGE_CONFIG = 'clashhub_config_v3'; 
const STORAGE_SOURCES = 'clashhub_sources_v3';
const STORAGE_LINKS = 'clashhub_links_v3';

const App: React.FC = () => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // App State
  const [config, setConfig] = useState<AppConfig>({
    githubToken: '', 
    repoOwner: DEFAULT_OWNER,
    repoName: DEFAULT_REPO,
    customDomain: DEFAULT_DOMAIN
  });

  const [sources, setSources] = useState<string[]>(DEFAULT_SOURCES);
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);

  // Initialize from storage
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_CONFIG);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig({
          ...parsed,
          repoOwner: parsed.repoOwner || DEFAULT_OWNER,
          repoName: parsed.repoName || DEFAULT_REPO
        });
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

    const savedLinks = localStorage.getItem(STORAGE_LINKS);
    if (savedLinks) {
      try {
        setCustomLinks(JSON.parse(savedLinks));
      } catch (e) {}
    }
  }, []);

  // Load latest links from GitHub on mount or repo change
  useEffect(() => {
    const loadRemoteLinks = async () => {
      if (config.repoOwner && config.repoName) {
        try {
          const links = await fetchCustomLinks(config);
          if (links && Array.isArray(links)) {
            setCustomLinks(links);
            localStorage.setItem(STORAGE_LINKS, JSON.stringify(links));
          }
        } catch (e) {}
      }
    };
    loadRemoteLinks();
  }, [config.repoOwner, config.repoName]);

  const handleConfigChange = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_CONFIG, JSON.stringify(newConfig));
  };

  const handleSourcesChange = (newSources: string[]) => {
    setSources(newSources);
    localStorage.setItem(STORAGE_SOURCES, JSON.stringify(newSources));
  };

  const handleLinksChange = (newLinks: CustomLink[]) => {
    setCustomLinks(newLinks);
    localStorage.setItem(STORAGE_LINKS, JSON.stringify(newLinks));
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header 
        onOpenAdmin={() => setIsAdminOpen(true)} 
        title={config.repoName ? `${config.repoName} Hub` : undefined}
      />
      
      <div className="flex-1">
        <PublicHome config={config} sources={sources} customLinks={customLinks} />
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
          customLinks={customLinks}
          onCustomLinksChange={handleLinksChange}
          onClose={() => setIsAdminOpen(false)}
        />
      )}
    </div>
  );
};

export default App;