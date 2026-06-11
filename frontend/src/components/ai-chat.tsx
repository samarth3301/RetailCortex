'use client';

import { useAuth } from '@clerk/nextjs';
import { Loader2, Send, Sparkles, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { agentQuery } from '@/lib/api';

type Role = 'user' | 'assistant';

type Message = {
  id: number;
  role: Role;
  text: string;
  toolUsed?: string | null;
};

let _id = 0;
const uid = () => ++_id;

const SUGGESTIONS = [
  { label: 'Mall health status', query: 'Show me the current mall health status and any open issues' },
  { label: 'Congestion overview', query: 'Which zones are most congested right now?' },
  { label: 'Low stock products', query: 'Which products are low on stock across all stores?' },
  { label: 'Active campaigns', query: 'What promotional campaigns are currently active?' },
];

const TOOL_LABELS: Record<string, string> = {
  search_products: 'Searching product catalog…',
  get_live_congestion: 'Fetching live congestion data…',
  get_store_health: 'Checking operational health…',
  report_issue: 'Filing facility report…',
};

function renderText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={j} className="font-semibold text-white">{part.slice(2, -2)}</strong>
        : <span key={j}>{part}</span>
    );
    return (
      <span key={i} className={line.startsWith('* ') || line.startsWith('- ') ? 'flex gap-1.5 items-start' : ''}>
        {(line.startsWith('* ') || line.startsWith('- ')) && (
          <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
        )}
        <span>{line.startsWith('* ') || line.startsWith('- ') ? rendered.slice(1) : rendered}</span>
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

export default function AiChat() {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(query: string) {
    const q = query.trim();
    if (!q || loading) return;
    setInput('');
    setError(null);
    setActiveTool(null);
    setMessages(prev => [...prev, { id: uid(), role: 'user', text: q }]);
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await agentQuery(q, token);
      if (res.tool_used) setActiveTool(res.tool_used);
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', text: res.answer, toolUsed: res.tool_used }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setActiveTool(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 shadow-xl transition-all duration-300 border font-semibold text-sm ${
          open
            ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_20px_rgba(91,77,255,0.25)]'
            : 'bg-zinc-900/95 border-zinc-700/60 text-zinc-300 hover:border-indigo-500/40 hover:text-indigo-300 hover:shadow-[0_0_20px_rgba(91,77,255,0.2)] hover:bg-indigo-600/10 backdrop-blur-md'
        }`}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        <Sparkles size={15} className={open ? 'text-indigo-400' : ''} />
        <span>RetailCortex AI</span>
        {open && <X size={13} className="ml-1 text-zinc-500" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[380px] flex flex-col glass-card rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-entrance"
          style={{ maxHeight: 'calc(100vh - 130px)', animationDuration: '0.2s' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 shrink-0 bg-zinc-950/40">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-none font-serif">RetailCortex AI</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Gemini 2.5 Flash · Operations Assistant</p>
            </div>
            {hasMessages && (
              <button
                onClick={() => setMessages([])}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {!hasMessages && !loading && (
              <div className="space-y-4 py-2">
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                    <Sparkles size={18} className="text-indigo-400" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-300 mt-3">Operations Intelligence</p>
                  <p className="text-[11px] text-zinc-500">Query live data, check congestion,<br />manage inventory and facility issues.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s.label}
                      onClick={() => send(s.query)}
                      className="text-left text-[11px] text-zinc-400 px-3 py-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/50 hover:border-indigo-500/30 hover:text-zinc-200 hover:bg-indigo-500/5 transition-all duration-200 leading-snug"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-5 h-5 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <Sparkles size={10} className="text-indigo-400" />
                  </div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600/20 border border-indigo-500/25 text-zinc-100 rounded-tr-sm'
                    : 'bg-zinc-950/70 border border-zinc-800/60 text-zinc-300 rounded-tl-sm'
                }`}>
                  <div className="whitespace-pre-wrap space-y-0.5">{renderText(msg.text)}</div>
                  {msg.toolUsed && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5">
                      <Zap size={9} className="text-indigo-500 shrink-0" />
                      <span className="text-[10px] text-zinc-600 font-mono">{msg.toolUsed}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start items-start gap-2">
                <div className="w-5 h-5 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={10} className="text-indigo-400" />
                </div>
                <div className="bg-zinc-950/70 border border-zinc-800/60 rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2">
                  <Loader2 size={11} className="text-indigo-400 animate-spin shrink-0" />
                  <span className="text-[11px] text-zinc-500">
                    {activeTool ? (TOOL_LABELS[activeTool] ?? 'Working…') : 'Thinking…'}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-400 text-center">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/5 shrink-0 bg-zinc-950/20">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3.5 py-2.5 focus-within:border-indigo-500/40 focus-within:shadow-[0_0_0_1px_rgba(91,77,255,0.15)] transition-all duration-200">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about stores, inventory, congestion…"
                disabled={loading}
                className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 outline-none disabled:opacity-50"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shrink-0"
              >
                <Send size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
