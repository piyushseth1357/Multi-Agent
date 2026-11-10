import React, { useState, useEffect } from 'react';
import { X, Folder, FileCode, Download, Copy, Check, GitBranch, Send } from 'lucide-react';
import { ProjectFile } from '../types';
import { apiFetch } from '../lib/api';

interface FileExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const FileExplorerModal: React.FC<FileExplorerModalProps> = ({ isOpen, onClose, projectId }) => {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // GitHub Push panel state
  const [showGitHubForm, setShowGitHubForm] = useState(false);
  const [ghOwner, setGhOwner] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [ghBranch, setGhBranch] = useState('main');
  const [ghToken, setGhToken] = useState('');
  const [pushing, setPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      setLoading(true);
      apiFetch(`/api/projects/${projectId}/tree`)
        .then(r => (r.ok ? r.json() : { files: [] }))
        .then(data => {
          setFiles(data.files || []);
          if (data.files && data.files.length > 0) {
            handleSelectFile(data.files[0].path);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen, projectId]);

  const handleSelectFile = (path: string) => {
    setSelectedPath(path);
    apiFetch(`/api/projects/${projectId}/file?path=${encodeURIComponent(path)}`)
      .then(r => (r.ok ? r.text() : '// File empty or missing'))
      .then(text => setFileContent(text));
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePushGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghOwner.trim() || !ghRepo.trim()) return;
    setPushing(true);
    setPushStatus(null);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/push-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: ghOwner.trim(),
          repo: ghRepo.trim(),
          branch: ghBranch.trim() || 'main',
          token: ghToken.trim() || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setPushStatus(`❌ Error: ${data?.detail?.error?.message || data?.detail || 'GitHub push failed'}`);
      } else {
        setPushStatus(`✅ Pushed ${data.pushed_count} files to ${data.repository} (${data.branch})`);
      }
    } catch (err: any) {
      setPushStatus(`❌ Network Error: ${err.message}`);
    } finally {
      setPushing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-surface-900 border border-slate-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-surface-800/60">
          <div className="flex items-center gap-2.5">
            <Folder className="w-5 h-5 text-brand-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Project Workspace Explorer
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowGitHubForm(!showGitHubForm)}
              className="py-1.5 px-3 rounded-lg text-xs font-medium text-slate-200 bg-surface-800 hover:bg-surface-700 border border-slate-700 flex items-center gap-2 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
              Push to GitHub
            </button>

            <a
              href={`/api/projects/${projectId}/download`}
              className="py-1.5 px-3 rounded-lg text-xs font-medium text-white holo-button flex items-center gap-2"
              download
            >
              <Download className="w-3.5 h-3.5 text-brand-300" />
              Download ZIP
            </a>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showGitHubForm && (
          <form onSubmit={handlePushGitHub} className="px-6 py-3 bg-surface-800/80 border-b border-slate-700 flex flex-wrap items-center gap-2 text-xs">
            <input
              type="text"
              placeholder="GitHub Username / Owner"
              value={ghOwner}
              onChange={e => setGhOwner(e.target.value)}
              required
              className="bg-surface-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-400"
            />
            <input
              type="text"
              placeholder="Repository Name"
              value={ghRepo}
              onChange={e => setGhRepo(e.target.value)}
              required
              className="bg-surface-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-400"
            />
            <input
              type="text"
              placeholder="Branch (main)"
              value={ghBranch}
              onChange={e => setGhBranch(e.target.value)}
              className="w-24 bg-surface-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-400"
            />
            <input
              type="password"
              placeholder="PAT Token (or uses .env)"
              value={ghToken}
              onChange={e => setGhToken(e.target.value)}
              className="w-48 bg-surface-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-400"
            />
            <button
              type="submit"
              disabled={pushing}
              className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              {pushing ? 'Pushing...' : 'Push Now'}
            </button>
            {pushStatus && <span className="text-xs text-slate-200 ml-2">{pushStatus}</span>}
          </form>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 border-r border-slate-800 bg-surface-950/70 p-3 overflow-y-auto space-y-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase px-2 mb-2 tracking-wider">
              Workspace Files ({files.length})
            </p>
            {files.map(f => (
              <button
                key={f.path}
                onClick={() => handleSelectFile(f.path)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all truncate ${
                  selectedPath === f.path
                    ? 'bg-brand-500/20 text-brand-300 font-medium border border-brand-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                <span className="truncate">{f.path}</span>
              </button>
            ))}

            {files.length === 0 && !loading && (
              <p className="text-xs text-slate-500 p-2">No files written yet.</p>
            )}
          </div>

          <div className="flex-1 flex flex-col bg-surface-900 overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-800/80 bg-surface-800/40 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300">
                {selectedPath || 'Select a file'}
              </span>
              {selectedPath && (
                <button
                  onClick={handleCopyCode}
                  className="py-1 px-2.5 rounded-md text-xs text-slate-300 hover:text-white bg-surface-700 hover:bg-surface-600 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-slate-200 leading-relaxed bg-surface-950 selection:bg-brand-500 selection:text-white">
              <code>{fileContent || '// Select a file from the tree to view its contents'}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
