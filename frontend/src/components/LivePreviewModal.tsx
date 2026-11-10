import React, { useState, useEffect } from 'react';
import { X, Smartphone, Monitor, RefreshCw } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface LivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const LivePreviewModal: React.FC<LivePreviewModalProps> = ({ isOpen, onClose, projectId }) => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (isOpen && projectId) {
      const loadPreview = async () => {
        try {
          let res = await apiFetch(`/api/projects/${projectId}/file?path=index.html`);
          if (!res.ok) {
            res = await apiFetch(`/api/projects/${projectId}/file?path=preview.html`);
          }
          const html = res.ok ? await res.text() : '';
          if (html) {
            setPreviewHtml(html);
            return;
          }
        } catch {
          // Fall back to status template below
        }

        setPreviewHtml(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-slate-900 text-white min-h-screen flex items-center justify-center p-6 text-center">
              <div>
                <h1 class="text-3xl font-bold text-sky-400 mb-2">Live Sandbox Ready</h1>
                <p class="text-slate-400 max-w-md">Generated code files are saved in your workspace. Open Workspace Files to inspect or download ZIP.</p>
              </div>
            </body>
          </html>
        `);
      };

      loadPreview();
    }
  }, [isOpen, projectId, refreshTick]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-6xl h-[88vh] bg-surface-900 border border-slate-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-surface-800/60">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Live In-Browser Sandbox
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRefreshTick(t => t + 1)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white bg-surface-700/60 border border-slate-700"
              title="Reload Preview"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <div className="bg-surface-700/60 rounded-lg p-1 flex items-center gap-1 border border-slate-700">
              <button
                onClick={() => setDevice('desktop')}
                className={`p-1.5 rounded-md ${device === 'desktop' ? 'bg-brand-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                title="Desktop View"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDevice('mobile')}
                className={`p-1.5 rounded-md ${device === 'mobile' ? 'bg-brand-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-700 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-surface-950 p-4 flex items-center justify-center overflow-auto">
          <div
            className={`h-full bg-white rounded-xl shadow-2xl transition-all duration-300 overflow-hidden border border-slate-700 ${
              device === 'mobile' ? 'w-[375px]' : 'w-full'
            }`}
          >
            <iframe
              title="Live Project Preview"
              srcDoc={previewHtml}
              sandbox="allow-scripts allow-same-origin allow-modals"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
