'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  onDismiss,
}) => {
  return (
    <div className="mx-4 my-2 p-3.5 bg-red-950/70 border border-red-800/80 rounded-xl text-red-200 text-sm flex items-center justify-between gap-3 shadow-lg backdrop-blur-sm transition-all duration-200">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
        <span className="truncate text-sm font-medium">{message}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-900/60 hover:bg-red-800/80 text-red-100 rounded-lg text-xs font-semibold border border-red-700/50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-1 text-red-400 hover:text-red-200 rounded-md hover:bg-red-900/40 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
