import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Plus, Trash2, Github, Key, Layout, Globe, Lock, Link as LinkIcon, Palette, Image as ImageIcon } from 'lucide-react';
import { AppConfig, CustomLink, DEFAULT_SOURCES, DEFAULT_DOMAIN } from '../types';
import { fetchRawContent, getRepoFile, uploadToRepo, saveCustomLinks, fetchCustomLinks } from '../services/githubService';

interface AdminDashboardProps {
  config: AppConfig;
  onConfigChange: (newConfig: AppConfig) => void;
  sources: string[];
  onSourcesChange: (newSources: string[]) => void;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  config, 
  onConfigChange, 
  sources,
  onSourcesChange,
  onClose
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // Sync Status
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Edit States
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [localSources, setLocalSources] = useState<string[]>(sources.length ? sources : DEFAULT_SOURCES);
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);

  // Initialize
  useEffect(() => {
    // If token exists in props, auto-login for UX
    if (config.githubToken) {
       setIsAuthenticated(true);
       loadLinks();
    }
  }, []);

  const loadLinks = async () => {
    if (localConfig.repoOwner && localConfig.repoName && localConfig.githubToken) {
       try {
         const links = await fetchCustomLinks(localConfig);
         if (links) setCustomLinks(links);
       } catch (e) {
         addLog(`Note: No existing custom links found or failed to load.`);
       }
    }
  };

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput) {
      const newConf = { ...localConfig, githubToken: passwordInput };
      setLocalConfig(newConf);
      onConfigChange(newConf);
      setIsAuthenticated(true);
      setTimeout(() => loadLinks(), 500);
    }
  };

  const handleSync = async () => {
    if (!localConfig.githubToken || !localConfig.repoName) {
        addLog("Error: Missing configuration (Token or Repo Name)");
        return;
    }

    setIsSyncing(true);
    setLogs([]); // Clear previous logs
    addLog("🚀 Starting synchronization process...");

    try {
        // 1. Process Config Sources
        for (let i = 0; i < localSources.length; i++) {
            const sourceUrl = localSources[i];
            const targetFilename = `clash/Neat_config${i + 1}.yml`;
            
            if (!sourceUrl.trim()) continue;

            addLog(`\n--- Processing Source ${i + 1} ---`);
            addLog(`Fetching: ${sourceUrl.substring(0, 50)}...`);
            
            try {
                const rawContent = await fetchRawContent(sourceUrl);
                
                // Get current SHA to update
                const currentFile = await getRepoFile(localConfig, targetFilename);
                
                addLog(`Uploading to ${localConfig.repoOwner}/${localConfig.repoName}/${targetFilename}...`);
                await uploadToRepo(
                    localConfig, 
                    targetFilename, 
                    rawContent, 
                    `Auto update source ${i+1} via ClashHub`,
                    currentFile?.sha
                );
                addLog(`✅ Success: ${targetFilename} updated.`);

            } catch (err: any) {
                addLog(`❌ Failed source ${i + 1}: ${err.message}`);
                console.error(err);
            }
        }

        addLog("\n✨ Sync cycle completed.");
    } catch (error: any) {
        addLog(`CRITICAL ERROR: ${error.message}`);
    } finally {
        setIsSyncing(false);
    }
  };

  const saveSettings = async () => {
    onConfigChange(localConfig);
    onSourcesChange(localSources);
    
    addLog("Saving Settings...");
    try {
      await saveCustomLinks(localConfig, customLinks);
      addLog("✅ Settings and Custom Links saved to repository.");
      alert("Settings Saved & Uploaded to GitHub!");
    } catch (e: any) {
      addLog(`❌ Error saving links: ${e.message}`);
      alert("Saved locally, but failed to upload links to GitHub. Check logs.");
    }
  };

  // UI Components helpers
  const updateSource = (index: number, val: string) => {
    const newSources = [...localSources];
    newSources[index] = val;
    setLocalSources(newSources);
  };
  
  const removeSource = (index: number) => {
    setLocalSources(localSources.filter((_, i) => i !== index));
  };

  const addSource = () => setLocalSources([...localSources, ""]);

  // Custom Links Helpers
  const addLink = () => {
      setCustomLinks([...customLinks, { 
          id: Date.now().toString(), 
          name: '我的按钮', 
          url: 'https://', 
          color: '#3b82f6', 
          icon: '⭐️' 
      }]);
  };

  const updateLink = (id: string, field: keyof CustomLink, val: string) => {
      setCustomLinks(customLinks.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  const removeLink = (id: string) => {
      setCustomLinks(customLinks.filter(l => l.id !== id));
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-night-card w-full max-w-md p-8 rounded-2xl shadow-2xl animate-scale-in">
          <div className="text-center mb-6">
             <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
               <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
             </div>
             <h2 className="text-2xl font-bold">后台登录</h2>
             <p className="text-gray-500 text-sm mt-2">请输入您的 GitHub Personal Access Token (PAT)</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="ghp_xxxxxxxxxxxx"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
            />
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                取消
              </button>
              <button type="submit" className="flex-1 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors">
                进入后台
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-day-bg/95 dark:bg-night-bg/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen p-4 sm:p-8">
        <div className="max-w-6xl mx-auto bg-white dark:bg-night-card rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-white/5">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Layout className="w-6 h-6" /> 后台管理面板
            </h2>
            <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-all shadow-md hover:shadow-lg ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? '同步进行中...' : '执行一键同步'}
                </button>
                <button 
                  onClick={saveSettings}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <Save className="w-4 h-4" /> 保存配置
                </button>
                <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  关闭
                </button>
            </div>
          </div>

          <div className="p-6 grid gap-8 lg:grid-cols-12">
            
            {/* Left Column: Config (4 cols) */}
            <div className="lg:col-span-4 space-y-8">
              {/* GitHub Settings */}
              <section className="space-y-4 bg-gray-50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2 dark:border-gray-700">
                  <Github className="w-5 h-5" /> 仓库配置
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-500 dark:text-gray-400">Owner (GitHub 用户名)</label>
                    <input 
                      className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={localConfig.repoOwner}
                      onChange={e => setLocalConfig({...localConfig, repoOwner: e.target.value})}
                      placeholder="e.g. dongchengjie"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-500 dark:text-gray-400">Repo Name (仓库名)</label>
                    <input 
                      className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={localConfig.repoName}
                      onChange={e => setLocalConfig({...localConfig, repoName: e.target.value})}
                      placeholder="e.g. clash-config"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-500 dark:text-gray-400 flex items-center gap-1">
                       <Key className="w-3 h-3" /> Token (PAT)
                    </label>
                    <input 
                      type="password"
                      className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={localConfig.githubToken}
                      onChange={e => setLocalConfig({...localConfig, githubToken: e.target.value})}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Token 必须拥有 Repo 读写权限。</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-500 dark:text-gray-400 flex items-center gap-1">
                       <Globe className="w-3 h-3" /> 自定义域名
                    </label>
                    <input 
                      className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={localConfig.customDomain}
                      onChange={e => setLocalConfig({...localConfig, customDomain: e.target.value})}
                      placeholder={DEFAULT_DOMAIN}
                    />
                  </div>
                </div>
              </section>

               {/* Console Logs */}
               <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  运行日志
                </h3>
                <div className="h-64 bg-black/90 text-green-400 p-4 rounded-xl font-mono text-xs overflow-y-auto shadow-inner border border-gray-800">
                   {logs.length === 0 && <span className="text-gray-500 italic">等待操作...</span>}
                   {logs.map((log, i) => (
                     <div key={i} className="whitespace-pre-wrap mb-1">{log}</div>
                   ))}
                </div>
              </section>
            </div>

            {/* Right Column: Content Management (8 cols) */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Custom Buttons */}
              <section className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2 dark:border-gray-700">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-blue-500" /> 自定义快捷按钮
                  </h3>
                  <button onClick={addLink} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 hover:scale-105 transition-transform text-sm font-medium">
                    <Plus className="w-4 h-4" /> 添加按钮
                  </button>
                </div>
                
                <div className="grid gap-4">
                  {customLinks.map((link) => (
                    <div key={link.id} className="group relative flex flex-col md:flex-row gap-4 items-start md:items-center p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                      
                      {/* Preview Icon */}
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0"
                        style={{ backgroundColor: link.color }}
                      >
                         {link.icon && link.icon.startsWith('http') ? (
                           <img src={link.icon} alt="" className="w-8 h-8 object-contain" />
                         ) : (
                           <span className="text-white">{link.icon || '🔗'}</span>
                         )}
                      </div>

                      {/* Inputs */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                         <div className="space-y-1">
                            <label className="text-[10px] uppercase text-gray-400 font-bold">按钮名称</label>
                            <input 
                              className="w-full text-sm p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-1 focus:ring-blue-500 outline-none"
                              placeholder="例如: Google"
                              value={link.name}
                              onChange={e => updateLink(link.id, 'name', e.target.value)}
                            />
                         </div>
                         
                         <div className="space-y-1">
                            <label className="text-[10px] uppercase text-gray-400 font-bold flex items-center gap-1"><ImageIcon className="w-3 h-3"/> 图标 (Emoji 或 URL)</label>
                            <input 
                              className="w-full text-sm p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-1 focus:ring-blue-500 outline-none"
                              placeholder="🔗 或 https://..."
                              value={link.icon || ''}
                              onChange={e => updateLink(link.id, 'icon', e.target.value)}
                            />
                         </div>

                         <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] uppercase text-gray-400 font-bold flex items-center gap-1"><LinkIcon className="w-3 h-3"/> 跳转链接</label>
                            <div className="flex gap-2">
                                <input 
                                  className="flex-1 text-sm p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 font-mono text-gray-600 dark:text-gray-300 focus:ring-1 focus:ring-blue-500 outline-none"
                                  placeholder="https://google.com"
                                  value={link.url}
                                  onChange={e => updateLink(link.id, 'url', e.target.value)}
                                />
                                <div className="relative">
                                    <input 
                                      type="color"
                                      className="w-10 h-10 rounded cursor-pointer border-0 p-0 overflow-hidden"
                                      value={link.color}
                                      onChange={e => updateLink(link.id, 'color', e.target.value)}
                                      title="选择背景颜色"
                                    />
                                    <Palette className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none mix-blend-difference" />
                                </div>
                            </div>
                         </div>
                      </div>

                      <button 
                        onClick={() => removeLink(link.id)} 
                        className="absolute top-2 right-2 md:relative md:top-auto md:right-auto p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="删除按钮"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {customLinks.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                      <p className="text-gray-500 text-sm">暂无自定义按钮，点击右上方 "添加按钮" 开始创建。</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Source URLs */}
              <section className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2 dark:border-gray-700">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Globe className="w-5 h-5 text-green-500" /> 订阅源列表
                  </h3>
                  <button onClick={addSource} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300 hover:scale-105 transition-transform text-sm font-medium">
                    <Plus className="w-4 h-4" /> 添加订阅源
                  </button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {localSources.map((url, i) => (
                    <div key={i} className="flex gap-2 items-center group">
                      <span className="text-xs font-mono text-gray-400 w-8 text-right select-none">{i + 1}.</span>
                      <input 
                        className="flex-1 text-xs font-mono p-2.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 focus:ring-1 focus:ring-green-500 outline-none"
                        value={url}
                        onChange={e => updateSource(i, e.target.value)}
                        placeholder="https://..."
                      />
                      <button onClick={() => removeSource(i)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-50 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};