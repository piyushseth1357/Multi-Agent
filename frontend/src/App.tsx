import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { LivePreviewModal } from './components/LivePreviewModal';
import { FileExplorerModal } from './components/FileExplorerModal';
import { User, Conversation } from './types';
import { apiFetch } from './lib/api';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);
  const [explorerProjectId, setExplorerProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      apiFetch('/api/conversations')
        .then(r => (r.ok ? r.json() : []))
        .then((data: Conversation[]) => {
          if (data && data.length > 0) {
            setConversations(data);
            setActiveId(data[0].id);
          } else {
            handleNewConversation();
          }
        })
        .catch(() => handleNewConversation());
    } else {
      setConversations([]);
      setActiveId(null);
    }
  }, [user?.id]);

  const handleNewConversation = async () => {
    try {
      const res = await apiFetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Blueprint Project' })
      });
      const newConv = await res.json();
      setConversations(prev => [newConv, ...prev]);
      setActiveId(newConv.id);
    } catch {
      const fallback: Conversation = {
        id: 'conv_' + Date.now(),
        title: 'New Blueprint Project',
        language: 'auto',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setConversations(prev => [fallback, ...prev]);
      setActiveId(fallback.id);
    }
  };

  const handleImportConversation = async (importPayload: any) => {
    try {
      const res = await apiFetch('/api/conversations/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importPayload)
      });
      if (res.ok) {
        const imported = await res.json();
        setConversations(prev => [imported, ...prev]);
        setActiveId(imported.id);
      }
    } catch {
      alert('Import failed — ensure backend server is running.');
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await apiFetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
    } catch {}
    setConversations(prev => prev.map(c => (c.id === id ? { ...c, title: newTitle } : c)));
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await apiFetch(`/api/conversations/${id}`, { method: 'DELETE' });
    } catch {}
    const remaining = conversations.filter(c => c.id !== id);
    setConversations(remaining);
    if (activeId === id) {
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLoginSuccess={setUser} />;
  }

  const activeConv = conversations.find(c => c.id === activeId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-900 text-slate-100">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={setActiveId}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onImportConversation={handleImportConversation}
        user={user}
        onLogout={handleLogout}
      />

      <ChatArea
        conversation={activeConv}
        onOpenPreview={setPreviewProjectId}
        onOpenFileExplorer={setExplorerProjectId}
      />

      <LivePreviewModal
        isOpen={!!previewProjectId}
        onClose={() => setPreviewProjectId(null)}
        projectId={previewProjectId || ''}
      />

      <FileExplorerModal
        isOpen={!!explorerProjectId}
        onClose={() => setExplorerProjectId(null)}
        projectId={explorerProjectId || ''}
      />
    </div>
  );
};
