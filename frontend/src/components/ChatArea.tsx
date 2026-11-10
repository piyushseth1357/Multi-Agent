import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Volume2,
  Sparkles,
  CheckCircle2,
  Layers,
  Play,
  Folder,
  ChevronDown,
  ChevronUp,
  SkipForward,
  Bot,
  User as UserIcon,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { Message, AgentActivityEvent, Conversation } from '../types';
import { apiFetch } from '../lib/api';

const AGENT_LABELS: Record<string, string> = {
  intent_classifier: 'Intent Director',
  chat_assistant: 'AI Coding Mentor',
  image_generator: 'Visual Image Studio (FLUX)',
  planner: 'Product Planner',
  architect: 'Software Architect',
  db_designer: 'Database Designer',
  api_designer: 'API Designer',
  ui_designer: 'UI/UX Designer',
  backend_dev: 'Backend Engineer',
  frontend_dev: 'Frontend Engineer',
  tester: 'QA & Security Tester',
  reviewer: 'Principal Code Reviewer'
};

interface ChatAreaProps {
  conversation: Conversation | null;
  onOpenPreview: (projectId: string) => void;
  onOpenFileExplorer: (projectId: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  onOpenPreview,
  onOpenFileExplorer
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [running, setRunning] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [agentActivities, setAgentActivities] = useState<AgentActivityEvent[]>([]);
  const [showAgentDrawer, setShowAgentDrawer] = useState(true);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentsText, setAttachmentsText] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentActivities]);

  useEffect(() => {
    setActiveProjectId(null);
    setAgentActivities([]);

    if (conversation) {
      apiFetch(`/api/conversations/${conversation.id}/messages`)
        .then(r => (r.ok ? r.json() : []))
        .then(data => {
          if (data && data.length > 0) {
            setMessages(data);
          } else {
            setMessages([
              {
                id: 'welcome',
                role: 'assistant',
                content: `👋 Namaste! Main aapka **AI Software Team Studio** hoon.\n\nAap mujhe kisi bhi tarah use kar sakte hain:\n- 💬 **Normal / Programming Chat**: *"React me useEffect kaise kaam karta hai?"* ya *"Is Python error ko fix karo"*\n- 🏗️ **Full Project / Website Builder**: *"Build a hospital appointment system"* ya *"Ek modern portfolio website banao (frontend only)"*\n- 🎨 **Free AI Image Generator**: *"Ek glowing neon tech logo ki image banao"*\n\nMain automatically sahi AI agents chalaunga aur unnecessary agents ko skip karke aapke tokens bachaunga!`,
                created_at: new Date().toISOString()
              }
            ]);
          }
        })
        .catch(() => {});
    }
  }, [conversation?.id]);

  const toggleSpeechRecognition = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setPrompt(prev => (prev ? prev + ' ' + transcript : transcript).trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const speakMessage = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`_]/g, ''));
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setAttachmentName(file.name);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch('/api/uploads', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.detail?.error?.message || 'File upload failed');
        setAttachmentName(null);
        setAttachmentsText('');
      } else {
        setAttachmentsText(data.extracted_text || '');
      }
    } catch {
      alert('Upload failed — check backend connection.');
      setAttachmentName(null);
      setAttachmentsText('');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const persistMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!conversation) return;
    try {
      await apiFetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content })
      });
    } catch {
      // Non-fatal in local preview mode
    }
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim() || running) return;

    const userText = prompt.trim();
    const displayContent = userText + (attachmentName ? `\n\n📎 Attached: ${attachmentName}` : '');
    const contextText = attachmentsText;
    const recentHistory = messages
      .filter(m => m.id !== 'welcome')
      .slice(-6)
      .map(m => ({ role: m.role, content: m.content }));

    setPrompt('');
    setAttachmentName(null);
    setAttachmentsText('');
    setRunning(true);
    setAgentActivities([]);

    const userMsg: Message = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: displayContent,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    await persistMessage('user', displayContent);

    try {
      const runRes = await apiFetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_prompt: userText,
          conversation_id: conversation?.id,
          attachments_text: contextText,
          chat_history: recentHistory,
          force_provider: selectedModel === 'auto' ? null : selectedModel
        })
      });
      if (!runRes.ok) {
        throw new Error(`Server returned HTTP ${runRes.status}`);
      }
      const runData = await runRes.json();
      const runId = runData.run_id;

      const eventSource = new EventSource(
        `/api/runs/${runId}/stream?force_provider=${selectedModel === 'auto' ? '' : selectedModel}`
      );

      eventSource.addEventListener('agent_started', (e: any) => {
        const data = JSON.parse(e.data);
        setAgentActivities(prev => [...prev, { agent: data.agent, status: 'started', loop: data.loop }]);
      });

      eventSource.addEventListener('agent_done', (e: any) => {
        const data = JSON.parse(e.data);
        setAgentActivities(prev =>
          prev.map(a =>
            a.agent === data.agent
              ? { ...a, status: 'done', provider: data.provider, model: data.model, output: data.output }
              : a
          )
        );
      });

      eventSource.addEventListener('agent_skipped', (e: any) => {
        const data = JSON.parse(e.data);
        setAgentActivities(prev => [...prev, { agent: data.agent, status: 'skipped', reason: data.reason }]);
      });

      eventSource.addEventListener('run_done', async (e: any) => {
        const data = JSON.parse(e.data);
        eventSource.close();
        setRunning(false);

        let aiContent = '';
        if (data.chat_reply) {
          aiContent = data.chat_reply;
        } else {
          setActiveProjectId(data.run_id);
          aiContent = `✅ **Architecture Blueprint & Starter Code Ready!**\n\nAll requested modules have been processed by the autonomous multi-agent pipeline.\n- **Files Written**: ${data.written_paths?.length || 0} files generated in project workspace.\n- **Project ID**: \`${data.run_id}\`\n\nAap **Live Preview** ya **Workspace Files** par click karke apni banti hui application ko inspect, GitHub par push, ya ZIP download kar sakte hain!`;
        }

        const aiMsg: Message = {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          content: aiContent,
          image_url: data.image_url,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMsg]);
        await persistMessage('assistant', aiContent);
      });

      eventSource.addEventListener('error', async (e: any) => {
        eventSource.close();
        setRunning(false);
        let errText = 'Pipeline execution failed. Check backend/.env API keys and backend server logs.';
        try {
          if (e?.data) {
            const parsed = JSON.parse(e.data);
            if (parsed.error) errText = parsed.error;
          }
        } catch {
          // Transport-level SSE close fallback
        }

        const errMsg: Message = {
          id: 'err_' + Date.now(),
          role: 'assistant',
          content: `⚠️ **Pipeline Error:**\n\n${errText}`,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, errMsg]);
        await persistMessage('assistant', errMsg.content);
      });
    } catch (err: any) {
      setRunning(false);
      const errMsg: Message = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: `⚠️ **Connection Error:** ${err.message}`,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errMsg]);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 h-screen flex flex-col bg-surface-900 overflow-hidden relative">
      <header className="px-6 py-3.5 border-b border-slate-800/80 bg-surface-900/60 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-sm font-semibold text-white tracking-wide holo-effect">
            {conversation?.title || 'New Project Studio'}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface-800 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-brand-400 mr-2" />
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs pr-1"
            >
              <option value="auto" className="bg-surface-800 text-white">⚡ Auto Switch (Smart Router)</option>
              <option value="groq" className="bg-surface-800 text-white">Groq (Llama 3.3 70B - Fast)</option>
              <option value="gemini" className="bg-surface-800 text-white">Google Gemini 2.5 Flash</option>
              <option value="openrouter" className="bg-surface-800 text-white">OpenRouter Free Router</option>
            </select>
          </div>

          {activeProjectId && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenPreview(activeProjectId)}
                className="py-1.5 px-3 rounded-lg text-xs font-medium text-white holo-button flex items-center gap-1.5 shadow"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                Live Preview
              </button>
              <button
                onClick={() => onOpenFileExplorer(activeProjectId)}
                className="py-1.5 px-3 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-surface-800 border border-slate-700 flex items-center gap-1.5 shadow"
              >
                <Folder className="w-3.5 h-3.5 text-brand-400" />
                Workspace Files
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-brand-500/20 border border-brand-500/30 text-brand-400 flex items-center justify-center flex-shrink-0 shadow">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`rounded-2xl p-4 text-xs leading-relaxed max-w-2xl relative group ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-tr-none shadow-md'
                  : 'holo-card rounded-tl-none text-slate-200 border border-slate-700/60 shadow-lg'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {msg.image_url && (
                <div className="mt-3 rounded-xl overflow-hidden border border-slate-700/80 bg-surface-950">
                  <img
                    src={msg.image_url}
                    alt="AI Generated Visual"
                    className="w-full max-h-96 object-contain"
                  />
                  <div className="p-2 flex justify-end bg-surface-900/90 border-t border-slate-800">
                    <a
                      href={msg.image_url}
                      target="_blank"
                      rel="noreferrer"
                      download="ai-generated-image.png"
                      className="text-[11px] text-brand-300 hover:text-brand-200 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Open / Download Image
                    </a>
                  </div>
                </div>
              )}

              {msg.role === 'assistant' && (
                <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-slate-400">
                  <span className="text-[10px] text-slate-500">Autonomous AI Team</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => speakMessage(msg.content)}
                      className="p-1 hover:text-brand-300 rounded transition-colors"
                      title="Read Aloud (TTS)"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="p-1 hover:text-brand-300 rounded transition-colors"
                      title="Copy Message"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-700 text-slate-300 flex items-center justify-center flex-shrink-0 shadow">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {(running || agentActivities.length > 0) && (
          <div className="max-w-4xl mx-auto">
            <div className="holo-card rounded-xl p-3 border border-brand-500/30 bg-surface-950/80 shadow-xl">
              <button
                onClick={() => setShowAgentDrawer(!showAgentDrawer)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-200 py-1"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-400" />
                  <span>Active AI Agents ({agentActivities.length})</span>
                  {running && <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping ml-1" />}
                </div>
                {showAgentDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAgentDrawer && (
                <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pt-2 border-t border-slate-800">
                  {agentActivities.map((act, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-surface-900/60 border border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        {act.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {act.status === 'started' && <span className="w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />}
                        {act.status === 'skipped' && <SkipForward className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="font-medium text-slate-200">
                          {AGENT_LABELS[act.agent] || act.agent}
                        </span>
                        {act.provider && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300 border border-brand-500/20">
                            {act.provider}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {act.status === 'skipped' ? `Skipped (${act.reason || 'Not required'})` : act.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-800/80 bg-surface-900/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          {attachmentName && (
            <div className="mb-2 inline-flex items-center gap-2 bg-surface-800 border border-slate-700 px-3 py-1 rounded-lg text-xs text-brand-300">
              <Paperclip className="w-3.5 h-3.5" />
              <span>{uploading ? `Uploading ${attachmentName}...` : attachmentName}</span>
              <button
                onClick={() => {
                  setAttachmentName(null);
                  setAttachmentsText('');
                }}
                className="ml-1 text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
          )}

          <div className="relative flex items-center bg-surface-800 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl focus-within:border-brand-500/70 focus-within:ring-1 focus-within:ring-brand-500/30 transition-all">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-brand-400 rounded-xl hover:bg-surface-700/60 transition-colors"
              title="Attach Document or Image (+)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-2.5 rounded-xl transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50'
                  : 'text-slate-400 hover:text-brand-400 hover:bg-surface-700/60'
              }`}
              title={isRecording ? 'Listening (Click to stop)...' : 'Voice Dictation (Hindi / English)'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendPrompt()}
              placeholder={isRecording ? 'Listening to your voice...' : 'Chat, ask coding help, generate images, or build an app...'}
              className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />

            <button
              onClick={handleSendPrompt}
              disabled={!prompt.trim() || running || uploading}
              className="p-2.5 rounded-xl holo-button text-white disabled:opacity-40 disabled:hover:scale-100 transition-all shadow"
            >
              <Send className="w-4 h-4 text-brand-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
