'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Sparkles,
  Search,
  Globe,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { ChatMessage as ChatMessageType, Conversation, StreamEvent } from '@/lib/types/chat';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { Sidebar } from '@/components/Sidebar';
import { AuthModal } from '@/components/AuthModal';
import { ErrorBanner } from '@/components/ErrorBanner';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

const SUGGESTED_PROMPTS = [
  {
    title: 'Current AI News',
    prompt: 'Search the web for the latest artificial intelligence news and model releases this week.',
    icon: Globe,
  },
  {
    title: 'Space Exploration',
    prompt: "What are the latest updates and missions announced by NASA and ESA recently?",
    icon: Search,
  },
  {
    title: 'Explain Simply',
    prompt: 'Explain how Large Language Models work under the hood in 3 clear bullet points.',
    icon: Sparkles,
  },
  {
    title: 'Agentic Tool Calling',
    prompt: 'What is the current price of Ethereum today, and what factors are influencing it?',
    icon: Zap,
  },
];

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState<string | null>(null);

  // Auth & UI state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSupabaseReady, setIsSupabaseReady] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, statusMessage]);

  // Check Supabase Auth configuration on mount
  useEffect(() => {
    const ready = isSupabaseConfigured();
    setIsSupabaseReady(ready);

    if (ready) {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setUser(session.user);
            setAccessToken(session.access_token);
            fetchConversations(session.access_token);
          }
        });

        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (session?.user) {
              setUser(session.user);
              setAccessToken(session.access_token);
              fetchConversations(session.access_token);
            } else {
              setUser(null);
              setAccessToken(null);
              setConversations([]);
            }
          }
        );

        return () => {
          authListener.subscription.unsubscribe();
        };
      }
    }
  }, []);

  // Fetch conversations from Supabase
  const fetchConversations = async (token: string) => {
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  // Load conversation messages
  const loadConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    setErrorMessage(null);

    if (accessToken) {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
          return;
        }
      } catch (err) {
        console.error('Failed to load messages for conversation:', err);
      }
    }
  };

  // Start a new chat
  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingText('');
    setStatusMessage(null);
    setErrorMessage(null);
    setInput('');
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Remove from local list
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      handleNewChat();
    }

    if (accessToken) {
      try {
        await fetch(`/api/conversations?id=${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (err) {
        console.error('Failed to delete conversation from server:', err);
      }
    }
  };

  // Sign out
  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setAccessToken(null);
    handleNewChat();
    setConversations([]);
  };

  // Stop ongoing generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStatusMessage(null);

    if (streamingText) {
      const partialMsg: ChatMessageType = {
        id: `partial-${Date.now()}`,
        conversation_id: activeConversationId || 'local',
        user_id: user?.id || 'guest',
        role: 'assistant',
        content: streamingText,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, partialMsg]);
      setStreamingText('');
    }
  };

  // Main chat submission handler
  const handleSendMessage = async (promptToSend?: string) => {
    const prompt = (promptToSend || input).trim();
    if (!prompt || isLoading) return;

    setErrorMessage(null);
    setLastUserPrompt(prompt);

    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      conversation_id: activeConversationId || 'local',
      user_id: user?.id || 'guest',
      role: 'user',
      content: prompt,
      created_at: new Date().toISOString(),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput('');
    setIsLoading(true);
    setStreamingText('');
    setStatusMessage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: prompt,
          conversationId: activeConversationId,
          history: messages,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `HTTP ${response.status}: Request failed`);
      }

      if (!response.body) {
        throw new Error('No response body returned by chat server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let detectedToolCalls: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;

          const lines = part.split('\n');
          let eventType = 'chunk';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.replace('event: ', '').trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.replace('data: ', '').trim();
            }
          }

          if (dataStr) {
            try {
              const parsed: StreamEvent = JSON.parse(dataStr);

              if (parsed.type === 'status') {
                setStatusMessage(parsed.message || 'Processing with Gemini...');
              } else if (parsed.type === 'chunk' && parsed.content) {
                setStatusMessage(null);
                accumulatedText += parsed.content;
                setStreamingText(accumulatedText);
              } else if (parsed.type === 'error') {
                setErrorMessage(parsed.message || 'Error occurred during generation.');
              } else if (parsed.type === 'done') {
                setStatusMessage(null);
                if (parsed.conversationId) {
                  setActiveConversationId(parsed.conversationId);
                  if (accessToken) {
                    fetchConversations(accessToken);
                  }
                }

                const assistantMessage: ChatMessageType = {
                  id: parsed.messageId || `assistant-${Date.now()}`,
                  conversation_id: parsed.conversationId || activeConversationId || 'local',
                  user_id: user?.id || 'guest',
                  role: 'assistant',
                  content: accumulatedText,
                  tool_calls: (parsed as any).toolCalls || undefined,
                  created_at: new Date().toISOString(),
                };

                setMessages((prev) => [...prev, assistantMessage]);
                setStreamingText('');
              }
            } catch (jsonErr) {
              console.warn('Failed to parse SSE event data chunk:', dataStr);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream generation was aborted by the user.');
      } else {
        console.error('Chat error:', err);
        setErrorMessage(
          err?.message || 'Failed to connect to the chat server. Please check your network or API keys.'
        );
      }
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
      abortControllerRef.current = null;
    }
  };

  // Retry action for failed responses
  const handleRetry = () => {
    if (lastUserPrompt) {
      // Remove failed assistant turn if partial
      setStreamingText('');
      setErrorMessage(null);
      handleSendMessage(lastUserPrompt);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d1117] text-[#e6edf3]">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={loadConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        userEmail={user?.email || null}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={handleSignOut}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        isSupabaseEnabled={isSupabaseReady}
      />

      {/* Main Chat View */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Header */}
        <header className="h-14 border-b border-white/5 bg-[#0d1117]/80 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-sm text-gray-100 truncate">
                {activeConversationId
                  ? conversations.find((c) => c.id === activeConversationId)?.title || 'Chat'
                  : 'New Chat'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 font-medium">
              <Globe className="w-3 h-3 text-blue-400" />
              <span>web_search tool enabled</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-medium">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Gemini 2.0 Flash</span>
            </div>
          </div>
        </header>

        {/* Error notification banner */}
        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onRetry={lastUserPrompt ? handleRetry : undefined}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {/* Message Feed / Conversation View */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {messages.length === 0 && !streamingText && !statusMessage ? (
            /* Welcome / Starter View */
            <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/20">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  What would you like to explore today?
                </h2>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  Ask me anything or request real-time news and facts. When live information is needed, I will automatically use the <code className="text-blue-400 font-mono text-xs">web_search</code> tool.
                </p>
              </div>

              {/* Starter Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                {SUGGESTED_PROMPTS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(item.prompt);
                        handleSendMessage(item.prompt);
                      }}
                      className="p-3.5 rounded-xl bg-[#161b22] hover:bg-[#21262d] border border-white/5 hover:border-white/10 transition-all text-xs text-gray-300 group flex flex-col gap-1.5 shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-blue-400 font-medium group-hover:text-blue-300">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.title}</span>
                      </div>
                      <p className="text-gray-400 group-hover:text-gray-200 line-clamp-2 leading-relaxed">
                        {item.prompt}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Active Message List */
            <div className="divide-y divide-white/[0.02]">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {/* Live Tool Execution Status Indicator */}
              {statusMessage && (
                <div className="px-4 py-4 flex items-center gap-3 bg-[#161b22]/40 border-y border-white/[0.04]">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4 animate-search-pulse" />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-blue-300">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{statusMessage}</span>
                  </div>
                </div>
              )}

              {/* Streaming Assistant Turn */}
              {streamingText && (
                <ChatMessage
                  message={{
                    id: 'temp-streaming',
                    conversation_id: activeConversationId || 'local',
                    user_id: user?.id || 'guest',
                    role: 'assistant',
                    content: streamingText,
                    created_at: new Date().toISOString(),
                  }}
                  isStreaming={true}
                />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar Area */}
        <div className="p-4 bg-[#0d1117] border-t border-white/5 shrink-0 max-w-4xl w-full mx-auto">
          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={() => handleSendMessage()}
            isLoading={isLoading}
            onStop={handleStopGeneration}
          />
          <p className="text-[11px] text-center text-gray-500 mt-2">
            Gemini models may produce inaccurate information. Real-time queries trigger autonomous web search.
          </p>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(authedUser) => {
          setUser(authedUser);
          if (accessToken) {
            fetchConversations(accessToken);
          }
        }}
      />
    </div>
  );
}
