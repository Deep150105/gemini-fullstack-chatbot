'use client';

import React, { useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isLoading: boolean;
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSubmit,
  isLoading,
  onStop,
  placeholder = 'Ask anything or search the web...',
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isLoading && input.trim() && !disabled) {
          onSubmit();
        }
      }}
      className="relative flex items-end gap-2 bg-[#161b22] border border-white/10 focus-within:border-blue-500/50 rounded-2xl p-2 shadow-2xl transition-all"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full resize-none bg-transparent px-3 py-1.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none max-h-44 disabled:opacity-50"
      />

      <div className="shrink-0 mb-0.5">
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="w-8 h-8 rounded-xl bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-sm"
            title="Stop generating"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white flex items-center justify-center transition-colors shadow-sm disabled:cursor-not-allowed"
            title="Send prompt (Enter)"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
};
