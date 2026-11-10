import React, { useState, useRef } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit3,
  MoreVertical,
  Search,
  LogOut,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload
} from 'lucide-react';
import { Conversation, User } from '../types';
import { apiFetch } from '../lib/api';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onImportConversation: (data: any) => void;
  user: User;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onImportConversation,
  user,
  onLogout
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartRename = (c: Conversation) => {
    setEditingId(c.id);
    setEditTitle(c.title);
    setActiveMenuId(null);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleExport = async (conv: Conversation, format: 'json' | 'md') => {
    setActiveMenuId(null);
    const res = await apiFetch(`/api/conversations/${conv.id}/export?format=${format}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      onImportConversation({
        title: parsed?.conversation?.title || parsed?.title || 'Imported Blueprint',
        language: parsed?.conversation?.language || 'auto',
        messages: parsed?.messages || []
      });
    } catch {
      alert('Invalid JSON export file.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <aside
      className={`h-screen bg-surface-900 border-r border-slate-800/80 flex flex-col transition-all duration-300 z-20 relative select-none ${
        collapsed ? 'w-16' : 'w-72'
      }`}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-surface-800 border border-slate-700 text-slate-300 hover:text-brand-400 flex items-center justify-center shadow-md z-30 transition-transform"
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 text-brand-400 flex items-center justify-center shadow-inner">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-sm text-white tracking-wide holo-effect">
                AI Software Team
              </span>
              <p className="text-[10px] text-slate-400">Agentic Orchestrator</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="p-3 flex gap-2">
        <button
          onClick={onNewConversation}
          className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-xs text-white holo-button flex items-center justify-center gap-2 shadow-sm ${
            collapsed ? 'px-0' : ''
          }`}
          title="New Blueprint Project"
        >
          <Plus className="w-4 h-4 text-brand-300" />
          {!collapsed && <span>New Project</span>}
        </button>

        {!collapsed && (
          <>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => importInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-slate-700 text-slate-300 hover:text-brand-300 transition-colors"
              title="Import Conversation JSON"
            >
              <Upload className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-surface-800/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1">
        {filtered.map(conv => {
          const isActive = conv.id === activeId;
          return (
            <div
              key={conv.id}
              className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-brand-500/15 border border-brand-500/30 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800/70'
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-brand-400' : 'text-slate-500'}`} />
                {!collapsed && (
                  editingId === conv.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveRename(conv.id)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveRename(conv.id)}
                      className="bg-surface-800 border border-brand-500 rounded px-1.5 py-0.5 text-xs text-white w-full outline-none"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate">{conv.title}</span>
                  )
                )}
              </div>

              {!collapsed && (
                <div className="relative flex-shrink-0">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === conv.id ? null : conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-slate-400 rounded transition-opacity"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {activeMenuId === conv.id && (
                    <div
                      className="absolute right-0 top-6 w-40 bg-surface-800 border border-slate-700/80 rounded-lg shadow-xl py-1 z-30"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleStartRename(conv)}
                        className="w-full px-3 py-1.5 text-left text-[11px] text-slate-300 hover:bg-surface-700 hover:text-white flex items-center gap-2"
                      >
                        <Edit3 className="w-3 h-3 text-slate-400" />
                        Rename
                      </button>
                      <button
                        onClick={() => handleExport(conv, 'json')}
                        className="w-full px-3 py-1.5 text-left text-[11px] text-slate-300 hover:bg-surface-700 hover:text-white flex items-center gap-2"
                      >
                        <Download className="w-3 h-3 text-brand-400" />
                        Export JSON
                      </button>
                      <button
                        onClick={() => handleExport(conv, 'md')}
                        className="w-full px-3 py-1.5 text-left text-[11px] text-slate-300 hover:bg-surface-700 hover:text-white flex items-center gap-2"
                      >
                        <Download className="w-3 h-3 text-emerald-400" />
                        Export Markdown
                      </button>
                      <button
                        onClick={() => {
                          onDeleteConversation(conv.id);
                          setActiveMenuId(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-[11px] text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && !collapsed && (
          <div className="text-center py-8 text-slate-500 text-xs">
            No projects yet.
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-800/80 bg-surface-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-400 to-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {user.email.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{user.email}</p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Free Quota Active
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-surface-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
