import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Plus, Trash2, Github, Key, Layout, Globe, Lock, Link as LinkIcon, Palette, Image as ImageIcon, AlertCircle, ListPlus, X, ExternalLink } from 'lucide-react';
import { AppConfig, CustomLink, DEFAULT_SOURCES, DEFAULT_DOMAIN } from '../types';
import { fetchRawContent, getRepoFile, uploadToRepo, saveCustomLinks, fetchCustomLinks } from '../services/githubService';

interface AdminDashboardProps {
  config: AppConfig;
  onConfigChange: (newConfig: AppConfig) => void;
  sources: string[];
  onSourcesChange: (newSources: string[]) => void;
  customLinks: CustomLink[];
  onCustomLinksChange: (newLinks: CustomLink[]) => void;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  config, 
  onConfigChange, 
  sources,
  onSourcesChange,
  customLinks,
  onCustomLinksChange,
  onClose
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [localSources, setLocalSources] = useState<string[]>(sources.length ? sources : DEFAULT_SOURCES);
  const [localLinks, setLocalLinks] = useState<CustomLink[]>(customLinks);
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [batchInputValue, setBatchInputValue] = useState('');

  useEffect(() => {
    if (config.githubToken) setIsAuthenticated(true);
  }, []);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput) {
      const newConf = { ...localConfig, githubToken: passwordInput };
      setLocalConfig(newConf);
      onConfigChange(newConf);
      setIsAuthenticated(true);
    }
  };

  const handleSync = async () => {
    if (!localConfig.githubToken || !localConfig.repoName || !localConfig.repoOwner) {
        addLog("❌ 错误: 配置不完整");
        return;
    }
    setIsSyncing(true);
    setLogs([]); 
    addLog("🚀 开始同步订阅源到仓库...");
    try {
        for (let i = 0; i < localSources.length; i++) {
            const sourceUrl = localSources[i];
            const targetFilename = `clash/Neat_config${i + 1}.yml`;
            if (!sourceUrl.trim()) continue;
            addLog(`正在获取并同步源 ${i + 1}: ${sourceUrl.substring(0, 30)}...`);
            try {
                const rawContent = await fetchRawContent(sourceUrl);
                const currentFile = await getRepoFile(localConfig, targetFilename);
                await uploadToRepo(localConfig, targetFilename, rawContent, `Update source ${i+1} via ClashHub`, currentFile?.sha);
                addLog(`✅ 成功上传: ${targetFilename}`);
            } catch (err: any) {
                addLog(`❌ 同步源 ${i+1} 失败: ${err.message}`);
            }
        }
        addLog("\n✨ 订阅源同步周期结束。");
    } finally {
        setIsSyncing(false);
    }
  };

  const saveSettings = async () => {
    if (!localConfig.githubToken) {
      alert("请输入 GitHub Token 以进行保存");
      return;
    }
    setIsSaving(true);
    addLog("正在保存应用配置到本地...");
    onConfigChange(localConfig);
    onSourcesChange(localSources);
    onCustomLinksChange(localLinks);
    
    addLog("正在上传 link.json 到 GitHub 仓库...");
    try {
      await saveCustomLinks(localConfig, localLinks);
      addLog("✅ 成功: 自定义按钮 link.json 已更新至仓库。");
      alert("设置已保存并同步至 GitHub！");
    } catch (e: any) {
      addLog(`❌ 失败: 无法同步 link.json 到仓库 (${e.message})`);
      alert("配置已本地保存，但同步至 GitHub 失败。请检查 Token 权限。");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSource = (index: number, val: string) => {
    const newSources = [...localSources];
    newSources[index] = val;
    setLocalSources(newSources);
  };
  
  const removeSource = (index: number) => setLocalSources(localSources.filter((_, i) => i !== index));
  const addSource = () => setLocalSources([...localSources, ""]);

  const handleBatchAdd = () => {
    const urls = batchInputValue.split('\n').map(u => u.trim()).filter(u => u && u.startsWith('http'));
    if (urls.length > 0) {
      setLocalSources([...localSources, ...urls]);
      setBatchInputValue('');
      setShowBatchAdd(false);
      addLog(`已批量添加 ${urls.length} 个新源。`);
    }
  };

  const addLink = () => {
      setLocalLinks([...localLinks, { 
          id: Date.now().toString(), 
          name: '新按钮', 
          url: 'https://', 
          color: '#3b82f6', 
          icon: '⭐️' 
      }]);
  };

  const updateLink = (id: string, field: keyof CustomLink, val: string) => {
      setLocalLinks(localLinks.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  const removeLink = (id: string) => setLocalLinks(localLinks.filter(l => l.id !== id));

  const isUrl = (str: string) => {
    try { return str.startsWith('http'); } catch (e) { return false; }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white dark:bg-night-card w-full max-w-md p-8 rounded-3xl shadow-2xl animate-scale-in border border-white/10">
          <div className="text-center mb-6">
             <div className="w-20 h-20 bg-blue-100 dark:bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-blue-50 dark:border-blue-900/30">
               <Lock className="w-10 h-10 text-blue-600 dark:text-blue-400" />
             </div>
             <h2 className="text-2xl font-black">后台管理登录</h2>
             <p className="text-gray-500 text-sm mt-3">请输入您的 GitHub Personal Access Token (PAT) 以启用远程同步功能。</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input type="password" className="w-full pl-10 pr-4 py-3.5 rounded-2xl border dark:border-gray-700 bg-gray-50 dark:bg-black/20 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="ghp_..." value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 font-bold transition-all">取消</button>
              <button type="submit" className="flex-1 py-3.5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20 transition-all">立即登录</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-day-bg/95 dark:bg-night-bg/95 backdrop-blur-md overflow-y-auto">
      <div className="min-h-screen p-4 sm:p-8">
        <div className="max-w-6xl mx-auto bg-white dark:bg-night-card rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          
          {/* Header */}
          <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-gray-50/50 dark:bg-white/5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30">
                <Layout className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black">控制中心</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Management Dashboard</p>
              </div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={handleSync} disabled={isSyncing} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-white font-black transition-all shadow-md ${isSyncing ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 active:scale-95'}`}>
                  <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? '同步中...' : '同步订阅'}
                </button>
                <button onClick={saveSettings} disabled={isSaving} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black transition-all shadow-lg shadow-blue-500/20 active:scale-95 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Save className="w-5 h-5" />
                  {isSaving ? '正在上传...' : '保存配置'}
                </button>
                <button onClick={onClose} className="px-6 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 font-bold transition-all">关闭</button>
            </div>
          </div>

          <div className="p-8 grid gap-8 lg:grid-cols-12">
            
            {/* Sidebar Column */}
            <div className="lg:col-span-4 space-y-8">
              <section className="p-6 bg-gray-50 dark:bg-white/[0.02] rounded-3xl border border-gray-100 dark:border-gray-800 space-y-6">
                <h3 className="text-lg font-black flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
                  <Github className="w-6 h-6 text-gray-700 dark:text-gray-300" /> 
                  基础仓库配置
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">GitHub 用户名</label>
                    <input className="w-full p-3.5 rounded-2xl border dark:border-gray-700 bg-white dark:bg-black/40 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={localConfig.repoOwner} onChange={e => setLocalConfig({...localConfig, repoOwner: e.target.value})} placeholder="例如: zhaifu" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">仓库名称</label>
                    <input className="w-full p-3.5 rounded-2xl border dark:border-gray-700 bg-white dark:bg-black/40 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={localConfig.repoName} onChange={e => setLocalConfig({...localConfig, repoName: e.target.value})} placeholder="例如: clash10" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">自定义显示域名</label>
                    <input className="w-full p-3.5 rounded-2xl border dark:border-gray-700 bg-white dark:bg-black/40 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={localConfig.customDomain} onChange={e => setLocalConfig({...localConfig, customDomain: e.target.value})} placeholder="https://clash.fastkj.eu.org" />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">同步状态与日志</h3>
                <div className="h-80 bg-black/95 text-emerald-400 p-6 rounded-3xl font-mono text-[11px] overflow-y-auto border border-gray-800 shadow-2xl leading-relaxed">
                   {logs.length === 0 && <span className="text-gray-600 italic">等待执行同步任务...</span>}
                   {logs.map((log, i) => <div key={i} className="mb-2 border-l-2 border-emerald-900/50 pl-3">{log}</div>)}
                </div>
              </section>
            </div>

            {/* Main Content Column */}
            <div className="lg:col-span-8 space-y-10">
              
              {/* Custom Buttons Management */}
              <section className="space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4">
                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-6 h-6 text-blue-500" />
                    <h3 className="text-xl font-black">自定义入口 (link.json)</h3>
                  </div>
                  <button onClick={addLink} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 hover:scale-105 transition-all text-sm font-black">
                    <Plus className="w-5 h-5" /> 新增入口
                  </button>
                </div>
                <div className="grid gap-6">
                  {localLinks.map((link) => (
                    <div key={link.id} className="flex flex-col md:flex-row gap-6 p-6 bg-gray-50/50 dark:bg-white/[0.03] rounded-3xl border-2 border-transparent hover:border-blue-500/20 transition-all group relative">
                      <div 
                        className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-xl shrink-0 overflow-hidden bg-white dark:bg-black/40 border-4 border-white dark:border-gray-800 group-hover:scale-110 transition-transform duration-500" 
                        style={{ backgroundColor: isUrl(link.icon || '') ? 'white' : link.color }}
                      >
                         {link.icon && isUrl(link.icon) ? (
                           <img src={link.icon} className="w-14 h-14 object-contain" />
                         ) : (
                           <span className="text-white drop-shadow-md">{link.icon || '🔗'}</span>
                         )}
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">入口名称</label>
                            <input className="w-full text-sm p-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-black/30 font-bold" placeholder="例如: 我的博客" value={link.name} onChange={e => updateLink(link.id, 'name', e.target.value)} />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">图标 (Emoji 或 图片 URL)</label>
                            <input className="w-full text-sm p-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-black/30 font-bold" placeholder="URL 或 表情" value={link.icon || ''} onChange={e => updateLink(link.id, 'icon', e.target.value)} />
                         </div>
                         <div className="md:col-span-2 flex gap-3 items-end">
                            <div className="flex-1 space-y-1">
                               <label className="text-[10px] font-black uppercase text-gray-400 ml-1">跳转 URL</label>
                               <input className="w-full text-sm p-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-black/30 font-mono" placeholder="https://..." value={link.url} onChange={e => updateLink(link.id, 'url', e.target.value)} />
                            </div>
                            <div className="shrink-0 space-y-1">
                               <label className="text-[10px] font-black uppercase text-gray-400 ml-1">主色调</label>
                               <input type="color" className="w-12 h-[42px] rounded-xl cursor-pointer border-0 p-1 bg-white dark:bg-gray-800 shadow-sm" value={link.color} onChange={e => updateLink(link.id, 'color', e.target.value)} />
                            </div>
                         </div>
                      </div>
                      <button onClick={() => removeLink(link.id)} className="p-3 text-gray-400 hover:text-red-500 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all absolute top-2 right-2 md:relative md:top-0 md:right-0">
                        <Trash2 className="w-6 h-6" />
                      </button>
                    </div>
                  ))}
                  {localLinks.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
                       <p className="text-gray-400 font-bold">尚未添加任何自定义快捷入口。</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Subscription Sources Management */}
              <section className="space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Globe className="w-6 h-6 text-emerald-500" />
                    <h3 className="text-xl font-black">源订阅同步管理 (GitHub 后端)</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowBatchAdd(!showBatchAdd)} className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 hover:scale-105 transition-all">
                      {showBatchAdd ? <X className="w-5 h-5" /> : <ListPlus className="w-5 h-5" />}
                      {showBatchAdd ? '取消' : '批量导入'}
                    </button>
                    <button onClick={addSource} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 hover:scale-105 transition-all text-sm font-black">
                      <Plus className="w-5 h-5" /> 添加源
                    </button>
                  </div>
                </div>
                {showBatchAdd && (
                  <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/30 animate-in fade-in slide-in-from-top-4">
                    <label className="block text-xs font-black uppercase text-blue-600 mb-2">批量粘贴订阅链接 (每行一个)</label>
                    <textarea className="w-full h-40 p-4 text-sm font-mono rounded-2xl border dark:border-gray-800 bg-white dark:bg-black/50 outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://... (每行一个)" value={batchInputValue} onChange={(e) => setBatchInputValue(e.target.value)}></textarea>
                    <button onClick={handleBatchAdd} className="mt-4 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20">确认添加有效源</button>
                  </div>
                )}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {localSources.map((url, i) => (
                    <div key={i} className="flex gap-3 items-center group bg-gray-50/30 dark:bg-white/5 p-2 rounded-2xl border border-transparent hover:border-emerald-500/20 transition-all">
                      <div className="text-[10px] font-black text-gray-400 w-8 text-center select-none bg-gray-100 dark:bg-black/40 py-1 rounded-lg">{i+1}</div>
                      <input className="flex-1 text-xs font-mono p-3 rounded-xl border dark:border-gray-800 bg-white dark:bg-black/40 outline-none focus:ring-2 focus:ring-emerald-500/50" value={url} onChange={e => updateSource(i, e.target.value)} placeholder="外部原始 GitHub / HTTP 订阅链接" />
                      <button onClick={() => removeSource(i)} className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-white dark:bg-black/20 rounded-xl">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {localSources.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
                       <p className="text-gray-400 font-bold">尚未添加任何订阅源。</p>
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