'use client';

import React from 'react';
import {
  MessageSquarePlus,
  MessageSquare,
  Trash2,
  LogOut,
  LogIn,
  Sparkles,
  Search,
  X,
} from 'lucide-react';
import { Conversation } from '@/lib/types/chat';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  userEmail: string | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  isSupabaseEnabled: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  userEmail,
  onOpenAuth,
  onSignOut,
  isOpen,
  onCloseMobile,
  isSupabaseEnabled,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`fixed md:static top-0 left-0 bottom-0 z-40 w-72 bg-[#0d1117] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">Gemini Chat</h1>
              <p className="text-[10px] text-gray-400">Agentic Web Search</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action: New Chat */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 hover:text-blue-100 text-sm font-medium transition-all shadow-sm"
          >
            <MessageSquarePlus className="w-4 h-4 text-blue-400" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Recent Conversations
          </div>

          {conversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-gray-500">
              No conversations yet. Start a new chat!
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onCloseMobile();
                  }}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#1c2128] text-white font-medium border border-white/10'
                      : 'text-gray-400 hover:bg-[#161b22] hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-blue-400' : 'text-gray-500'
                      }`}
                    />
                    <span className="truncate">{conv.title || 'Untitled Chat'}</span>
                  </div>

                  <button
                    onClick={(e) => onDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 rounded transition-opacity"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Supabase status notice if unconfigured */}
        {!isSupabaseEnabled && (
          <div className="mx-3 my-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px] leading-tight">
            <p className="font-semibold mb-0.5">Guest / Local Mode</p>
            <p className="text-amber-400/80">
              Supabase credentials not configured in <code className="font-mono">.env.local</code>. Chats are saved locally in browser memory.
            </p>
          </div>
        )}

        {/* User Account Footer */}
        <div className="p-3 border-t border-white/5 bg-[#161b22]/40">
          {userEmail ? (
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-xs font-semibold text-gray-200 truncate">{userEmail}</p>
                <p className="text-[10px] text-emerald-400">Authenticated</p>
              </div>
              <button
                onClick={onSignOut}
                className="p-1.5 text-gray-400 hover:text-red-300 hover:bg-white/5 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium border border-white/5 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
