export interface User {
  id: string;
  email: string;
}

export interface Conversation {
  id: string;
  title: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image_url?: string;
  language?: string;
  created_at: string;
}

export interface ProjectFile {
  path: string;
  name: string;
  size_bytes: number;
}

export interface AgentActivityEvent {
  agent: string;
  status: 'started' | 'done' | 'skipped';
  provider?: string;
  model?: string;
  reason?: string;
  output?: any;
  loop?: number;
}
