'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Check, Copy, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { ChatMessage as ChatMessageType, ToolCall, ToolResult } from '@/lib/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showToolDetails, setShowToolDetails] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group flex gap-3 px-4 py-5 transition-colors ${
        isUser ? 'bg-transparent' : 'bg-[#161b22]/60 border-y border-white/[0.04]'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
            : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header (Role & Copy action) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-300">
              {isUser ? 'You' : 'Gemini Assistant'}
            </span>
            <span className="text-[10px] text-gray-500">
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-200 rounded hover:bg-white/5 transition-all text-xs flex items-center gap-1"
            title="Copy message"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] text-emerald-400">Copied</span>
              </>
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Tool Call & Result Metadata Badge (if web_search was called) */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-950/30 p-2 text-xs">
            <button
              onClick={() => setShowToolDetails(!showToolDetails)}
              className="flex items-center justify-between w-full text-blue-300 hover:text-blue-200 font-medium"
            >
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  Web Search performed:{' '}
                  <span className="text-blue-100 font-semibold">
                    "{message.tool_calls[0].args?.query || 'query'}"
                  </span>
                </span>
              </div>
              {showToolDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showToolDetails && message.tool_results && (
              <div className="mt-2 pt-2 border-t border-blue-500/20 space-y-1.5 text-gray-300">
                {message.tool_results.map((tr, idx) => {
                  const items = tr.result?.results || [];
                  if (items.length === 0) {
                    return (
                      <p key={idx} className="text-gray-400 italic">
                        {tr.result?.message || 'No specific search results returned.'}
                      </p>
                    );
                  }
                  return (
                    <div key={idx} className="space-y-1">
                      <p className="text-[11px] text-gray-400">Sources consulted:</p>
                      <ul className="space-y-1 pl-2">
                        {items.slice(0, 3).map((item: any, i: number) => (
                          <li key={i} className="text-xs truncate">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline inline-flex items-center gap-1"
                            >
                              • {item.title || item.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Message Body */}
        <div
          className={`prose prose-invert prose-sm max-w-none break-words text-gray-200 leading-relaxed ${
            isStreaming ? 'streaming-cursor' : ''
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-gray-200">{children}</li>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline hover:text-blue-300 transition-colors"
                  >
                    {children}
                  </a>
                ),
                code({ inline, className, children, ...props }: any) {
                  return inline ? (
                    <code className="bg-[#21262d] text-emerald-300 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                      {children}
                    </code>
                  ) : (
                    <div className="my-3 overflow-hidden rounded-lg border border-white/10 bg-[#0d1117]">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] text-xs text-gray-400 border-b border-white/5">
                        <span className="font-mono">{className?.replace('language-', '') || 'code'}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                          }}
                          className="hover:text-gray-200 text-[11px] flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <pre className="p-3 text-xs font-mono text-gray-200 overflow-x-auto">
                        <code>{children}</code>
                      </pre>
                    </div>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
};
