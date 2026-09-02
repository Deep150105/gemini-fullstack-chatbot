export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCall {
  name: string;
  args: Record<string, any>;
  thought_signature?: string;
  thoughtSignature?: string;
}

export interface ToolResult {
  name: string;
  result: any;
  error?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: Role;
  content: string;
  tool_calls?: ToolCall[] | null;
  tool_results?: ToolResult[] | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface StreamEvent {
  type: 'status' | 'chunk' | 'tool_call' | 'tool_result' | 'done' | 'error';
  content?: string;
  message?: string;
  tool?: string;
  query?: string;
  result?: any;
  messageId?: string;
  conversationId?: string;
}
