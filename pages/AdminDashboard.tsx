import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Plus, Trash2, Github, Key, Layout, Globe, Lock, Link as LinkIcon, Palette, Image as ImageIcon, AlertCircle, ListPlus, X } from 'lucide-react';
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
  
  // Batch Add State
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [batchInputValue, setBatchInputValue] = useState('');

  // Initialize
  useEffect(() => {
    if (config.githubToken) {
       setIsAuthenticated(true);
       loadLinks();
    }
  }, []);

  const loadLinks = async () => {
    if (localConfig.repoOwner && localConfig.repoName) {
       try {
         const links = await fetchCustomLinks(localConfig);
         if (links && Array.isArray(links)) {
            setCustomLinks(links);
         }
       } catch (e) {
         console.warn("Failed to load custom links", e);
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
    if (!localConfig.githubToken || !localConfig.repoName || !localConfig.repoOwner) {
        addLog("❌ 错误: 配置不完整 (Token, Owner 或 Repo Name 缺失)");
        return;
    }

    setIsSyncing(true);
    setLogs([]); 
    addLog("🚀 开始同步进程...");

    try {
        for (let i = 0; i < localSources.length; i++) {
            const sourceUrl = localSources[i];
            const targetFilename = `clash/Neat_config${i + 1}.yml`;
            
            if (!sourceUrl.trim()) continue;

            addLog(`\n--- 处理源 ${i + 1} ---`);
            addLog(`正在获取: ${sourceUrl.substring(0, 50)}...`);
            
            try {
                const rawContent = await fetchRawContent(sourceUrl);
                const currentFile = await getRepoFile(localConfig, targetFilename);
                
                addLog(`正在上传到 ${localConfig.repoOwner}/${localConfig.repoName}/${targetFilename}...`);
                await uploadToRepo(
                    localConfig, 
                    targetFilename, 
                    rawContent, 
                    `Auto update source ${i+1} via ClashHub`,
                    currentFile?.sha
                );
                addLog(`✅ 成功: ${targetFilename} 已更新。`);

            } catch (err: any) {
                addLog(`❌ 失败 (源 ${i + 1}): ${err.message}`);
                if (err.message.includes("Not Found")) {
                    addLog("提示: 请检查仓库名和用户名是否完全正确，并确保 Token 拥有此仓库的写入权限。");
                    break; 
                }
            }
        }

        addLog("\n✨ 同步周期结束。");
    } catch (error: any) {
        addLog(`🛑 严重错误: ${error.message}`);
    } finally {
        setIsSyncing(false);
    }
  };

  const saveSettings = async () => {
    onConfigChange(localConfig);
    onSourcesChange(localSources);
    
    addLog("正在保存设置...");
    try {
      await saveCustomLinks(localConfig, customLinks);
      addLog("✅ 设置和自定义链接已同步至 GitHub 仓库。");
      alert("设置已保存并同步！");
    } catch (e: any) {
      addLog(`❌ 报错: ${e.message}`);
      alert("本地已保存，但无法同步至 GitHub (请检查 Token 权限)。");
    }
  };

  const updateSource = (index: number, val: string) => {
    const newSources = [...localSources];
    newSources[index] = val;
    setLocalSources(newSources);
  };
  
  const removeSource = (index: number) => {
    setLocalSources(localSources.filter((_, i) => i !== index));
  };

  const addSource = () => setLocalSources([...localSources, ""]);

  const handleBatchAdd = () => {
    const urls = batchInputValue
      .split('\n')
      .map(u => u.trim())
      .filter(u => u && (u.startsWith('http://') || u.startsWith('https://')));
    
    if (urls.length > 0) {
      setLocalSources([...localSources, ...urls]);
      setBatchInputValue('');
      setShowBatchAdd(false);
      addLog(`已批量添加 ${urls.length} 个新源。`);
    }
  };

  const addLink = () => {
      setCustomLinks([...customLinks, { 
          id: Date.now().toString(), 
          name: '新按钮', 
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
             <h2 className="text-2xl font-bold">后台管理</h2>
             <p className="text-gray-500 text-sm mt-2">只有进行<span className="font-bold text-gray-700 dark:text-gray-300">修改配置</span>或<span className="font-bold text-gray-700 dark:text-gray-300">执行同步</span>时需要登录</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="请输入 GitHub PAT Token"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                取消
              </button>
              <button type="submit" className="flex-1 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors">
                确认
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
                  {isSyncing ? '同步中...' : '开始同步'}
                </button>
                <button 
                  onClick={saveSettings}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <Save className="w-4 h-4" /> 保存
                </button>
                <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  关闭
                </button>
            </div>
          </div>

          <div className="p-6 grid gap-8 lg:grid-cols-12">
            
            <div className="lg:col-span-4 space-y-8">
              <section className="space-y-4 bg-gray-50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2 dark:border-gray-700">
                  <Github className="w-5 h-5" /> 基础配置
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-500 dark:text-gray-400">Owner (用户名)</label>
                    <input 
                      className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={localConfig.repoOwner}
                      onChange={e => setLocalConfig({...localConfig, repoOwner: e.target.value})}
                      placeholder="例如: dongchengjie"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-500 dark:text-gray-400">Repo Name (仓库名)</label>
                    <input 
                      className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={localConfig.repoName}
                      onChange={e => setLocalConfig({...localConfig, repoName: e.target.value})}
                      placeholder="例如: airport"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-500 dark:text-gray-400 flex items-center gap-1">
                       <Key className="w-3 h-3" /> GitHub Token
                    </label>
                    <input 
                      type="password"
                      className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={localConfig.githubToken}
                      onChange={e => setLocalConfig({...localConfig, githubToken: e.target.value})}
                      placeholder="ghp_..."
                    />
                  </div>
                </div>
              </section>

               <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  同步日志
                </h3>
                <div className="h-64 bg-black/90 text-green-400 p-4 rounded-xl font-mono text-[10px] overflow-y-auto shadow-inner border border-gray-800">
                   {logs.length === 0 && <span className="text-gray-500 italic">待命...</span>}
                   {logs.map((log, i) => (
                     <div key={i} className="mb-1">{log}</div>
                   ))}
                </div>
              </section>
            </div>

            <div className="lg:col-span-8 space-y-8">
              
              <section className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2 dark:border-gray-700">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-blue-500" /> 快捷按钮管理
                  </h3>
                  <button onClick={addLink} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 hover:scale-105 transition-transform text-sm font-medium">
                    <Plus className="w-4 h-4" /> 添加
                  </button>
                </div>
                
                <div className="grid gap-4">
                  {customLinks.map((link) => (
                    <div key={link.id} className="group relative flex flex-col md:flex-row gap-4 items-start md:items-center p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0"
                        style={{ backgroundColor: link.color }}
                      >
                         <span className="text-white">{link.icon || '🔗'}</span>
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                         <input 
                           className="text-sm p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20"
                           placeholder="名称"
                           value={link.name}
                           onChange={e => updateLink(link.id, 'name', e.target.value)}
                         />
                         <input 
                           className="text-sm p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20"
                           placeholder="图标 (Emoji)"
                           value={link.icon || ''}
                           onChange={e => updateLink(link.id, 'icon', e.target.value)}
                         />
                         <div className="md:col-span-2 flex gap-2">
                            <input 
                              className="flex-1 text-sm p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 font-mono"
                              placeholder="URL"
                              value={link.url}
                              onChange={e => updateLink(link.id, 'url', e.target.value)}
                            />
                            <input 
                              type="color"
                              className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                              value={link.color}
                              onChange={e => updateLink(link.id, 'color', e.target.value)}
                            />
                         </div>
                      </div>
                      <button 
                        onClick={() => removeLink(link.id)} 
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2 dark:border-gray-700">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Globe className="w-5 h-5 text-green-500" /> 订阅源同步 (同步至 clash/ 目录)
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowBatchAdd(!showBatchAdd)} 
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${showBatchAdd ? 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 hover:scale-105'}`}
                    >
                      {showBatchAdd ? <X className="w-4 h-4" /> : <ListPlus className="w-4 h-4" />}
                      {showBatchAdd ? '取消' : '批量添加'}
                    </button>
                    <button onClick={addSource} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300 hover:scale-105 transition-transform text-sm font-medium">
                      <Plus className="w-4 h-4" /> 添加源
                    </button>
                  </div>
                </div>

                {showBatchAdd && (
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-xs font-bold uppercase tracking-tight text-blue-600 dark:text-blue-400 mb-2">批量输入订阅链接 (每行一个)</label>
                    <textarea 
                      className="w-full h-32 p-3 text-sm font-mono rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-black/40 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="https://example.com/sub1&#10;https://example.com/sub2"
                      value={batchInputValue}
                      onChange={(e) => setBatchInputValue(e.target.value)}
                    ></textarea>
                    <button 
                      onClick={handleBatchAdd}
                      className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                    >
                      确认添加有效链接
                    </button>
                  </div>
                )}

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {localSources.map((url, i) => (
                    <div key={i} className="flex gap-2 items-center group">
                      <div className="text-[10px] font-mono text-gray-400 w-6 text-right select-none">{i+1}</div>
                      <input 
                        className="flex-1 text-xs font-mono p-2.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 focus:bg-white dark:focus:bg-black/20 focus:ring-1 focus:ring-blue-400 outline-none"
                        value={url}
                        onChange={e => updateSource(i, e.target.value)}
                        placeholder="订阅链接 https://..."
                      />
                      {/* Fixed: Use correct index variable "i" from map loop instead of undefined "index" */}
                      <button onClick={() => removeSource(i)} className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {localSources.length === 0 && (
                    <div className="flex items-center gap-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>尚未添加任何订阅源。点击“添加源”或“批量添加”开始。</span>
                    </div>
                  )}
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};