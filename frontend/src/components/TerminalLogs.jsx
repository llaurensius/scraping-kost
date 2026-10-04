import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

export default function TerminalLogs({ logs = [], onClear }) {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'success':
        return 'text-emerald-400 font-bold';
      case 'error':
        return 'text-rose-400 font-bold';
      case 'warn':
        return 'text-amber-400 font-bold';
      case 'progress':
        return 'text-sky-400 font-bold';
      default:
        return 'text-slate-400';
    }
  };

  const latestLog = logs[logs.length - 1];

  return (
    <div className="fixed bottom-0 left-80 right-0 z-30 bg-slate-950 border-t border-slate-800 shadow-2xl transition-all">
      {/* Header bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-2 cursor-pointer bg-slate-900/90 hover:bg-slate-900 border-b border-slate-800 select-none text-xs"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-slate-200">Live Scraping Terminal</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
            {logs.length} logs
          </span>
          {latestLog && !isOpen && (
            <span className="text-[11px] text-slate-400 truncate max-w-lg ml-3">
              &gt; {latestLog.message}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {logs.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onClear) onClear();
              }}
              className="p-1 text-slate-400 hover:text-slate-200"
              title="Bersihkan Log"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded Logs Body */}
      {isOpen && (
        <div
          ref={scrollRef}
          className="h-48 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 bg-black/80"
        >
          {logs.length === 0 ? (
            <div className="text-slate-500 italic">Menunggu aktivitas scraping...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 select-none">[{log.timestamp || '00:00:00'}]</span>
                <span className={`uppercase w-14 flex-shrink-0 ${getLevelColor(log.level)}`}>
                  [{log.level || 'INFO'}]
                </span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
