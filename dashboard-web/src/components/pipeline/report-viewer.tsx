'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronUp, ChevronDown, ExternalLink, FileText, AlertCircle } from 'lucide-react';

interface ReportViewerProps {
  reportPath: string | null;
  title: string;
  careerOpsPath: string;
  onClose: () => void;
}

interface ParsedLine {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'text' | 'table' | 'hr' | 'blockquote' | 'code' | 'list';
  content: string;
  cells?: string[][];
  colWidths?: number[];
  indent?: number;
  ordered?: boolean;
  bold?: boolean;
  italic?: boolean;
}

export function ReportViewer({ reportPath, title, careerOpsPath, onClose }: ReportViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const scrollHeight = 60;
  const visibleHeight = 80;
  const maxScroll = Math.max(0, scrollHeight - visibleHeight);

  const loadReport = useCallback(async () => {
    if (!reportPath) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(reportPath)}?path=${encodeURIComponent(careerOpsPath)}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setContent(data.content || '');
      }
    } catch {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [reportPath, careerOpsPath]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        setScrollOffset(prev => Math.min(prev + 1, maxScroll));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        setScrollOffset(prev => Math.max(prev - 1, 0));
      } else if (e.key === ' ' || e.key === 'PageDown') {
        setScrollOffset(prev => Math.min(prev + 10, maxScroll));
      } else if (e.key === 'PageUp') {
        setScrollOffset(prev => Math.max(prev - 10, 0));
      } else if (e.key === 'Home') {
        setScrollOffset(0);
      } else if (e.key === 'End') {
        setScrollOffset(maxScroll);
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, maxScroll]);

  const lines = content.split('\n');
  const visibleLines = lines.slice(scrollOffset, scrollOffset + visibleHeight);

  return (
    <AnimatePresence>
      {reportPath && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative ml-auto w-full max-w-4xl bg-[#0f0f13] border-l border-[#2a2a38] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a38] bg-[#1a1a21]">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScrollOffset(0)}
                  className="p-2 text-slate-500 hover:text-slate-200 hover:bg-[#242430] rounded-lg transition-colors"
                  title="Scroll to top"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <div className="px-3 py-1 bg-[#242430] rounded text-xs text-slate-500 font-mono">
                  {scrollOffset + 1}-{Math.min(scrollOffset + visibleHeight, scrollHeight)} / {scrollHeight}
                </div>
                <button
                  onClick={() => setScrollOffset(maxScroll)}
                  className="p-2 text-slate-500 hover:text-slate-200 hover:bg-[#242430] rounded-lg transition-colors"
                  title="Scroll to bottom"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-500 hover:text-slate-200 hover:bg-[#242430] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                    <p className="text-slate-400">{error}</p>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto scrollbar-thin p-6">
                  {visibleLines.map((line, i) => (
                    <div key={i} className="mb-1">
                      {renderLine(line)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-[#2a2a38] bg-[#1a1a21] flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span>↑↓ scroll</span>
                <span>Esc close</span>
                <span>G go top</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-24 h-1.5 bg-[#242430] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all"
                    style={{ width: `${(scrollOffset / maxScroll) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function renderLine(line: string): React.ReactNode {
  const trimmed = line.trim();

  if (!trimmed) return <div className="h-4" />;

  if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
    return <hr className="border-[#2a2a38] my-4" />;
  }

  if (trimmed.startsWith('# ')) {
    return (
      <h1 className="text-2xl font-bold text-slate-100 mt-6 mb-3 tracking-tight">
        {renderInline(trimmed.slice(2))}
      </h1>
    );
  }

  if (trimmed.startsWith('## ')) {
    return (
      <h2 className="text-xl font-semibold text-slate-200 mt-5 mb-2">
        {renderInline(trimmed.slice(3))}
      </h2>
    );
  }

  if (trimmed.startsWith('### ')) {
    return (
      <h3 className="text-lg font-medium text-slate-300 mt-4 mb-2">
        {renderInline(trimmed.slice(4))}
      </h3>
    );
  }

  if (trimmed.startsWith('#### ')) {
    return (
      <h4 className="text-base font-medium text-slate-400 mt-3 mb-1">
        {renderInline(trimmed.slice(5))}
      </h4>
    );
  }

  if (trimmed.startsWith('> ')) {
    return (
      <blockquote className="pl-4 border-l-2 border-[#3a3a48] text-slate-400 italic my-3">
        {renderInline(trimmed.slice(2))}
      </blockquote>
    );
  }

  if (trimmed.startsWith('|')) {
    return renderTable(trimmed);
  }

  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
    return (
      <div className="flex items-start gap-2 text-slate-300 my-1">
        <span className="text-blue-400 mt-0.5">•</span>
        <span>{renderInline(trimmed.slice(2))}</span>
      </div>
    );
  }

  if (/^\d+\.\s/.test(trimmed)) {
    const match = trimmed.match(/^(\d+)\.\s(.*)$/);
    if (match) {
      return (
        <div className="flex items-start gap-2 text-slate-300 my-1">
          <span className="text-slate-500 font-mono text-sm w-6 text-right">{match[1]}.</span>
          <span>{renderInline(match[2])}</span>
        </div>
      );
    }
  }

  if (trimmed.startsWith('```')) {
    return null;
  }

  return (
    <p className="text-slate-300 leading-relaxed my-1">
      {renderInline(trimmed)}
    </p>
  );
}

function renderTable(line: string): React.ReactNode {
  const trimmed = line.trim();
  if (trimmed.includes('---')) return null;

  const cells = trimmed
    .slice(1, -1)
    .split('|')
    .map(c => c.trim());

  const isHeader = cells.some(c => /\*\*[^*]+\*\*/.test(c));

  if (isHeader) {
    return (
      <div className="flex gap-4 py-2 border-b border-[#2a2a38]">
        {cells.map((cell, i) => (
          <div key={i} className="flex-1 text-sm font-semibold text-slate-200">
            {renderInline(cell)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 py-1.5 hover:bg-[#1a1a21]/50 -mx-2 px-2 rounded">
      {cells.map((cell, i) => (
        <div key={i} className="flex-1 text-sm text-slate-400">
          {renderInline(cell)}
        </div>
      ))}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  const boldRegex = /\*\*([^*]+)\*\*/g;
  let match;
  let lastIndex = 0;
  const boldMatches: { start: number; end: number; content: string }[] = [];

  while ((match = boldRegex.exec(text)) !== null) {
    boldMatches.push({ start: match.index, end: match.index + match[0].length, content: match[1] });
  }

  if (boldMatches.length === 0) {
    return <span key={key}>{text}</span>;
  }

  for (const m of boldMatches) {
    if (m.start > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, m.start)}</span>);
    }
    parts.push(
      <span key={key++} className="font-semibold text-yellow-400">
        {m.content}
      </span>
    );
    lastIndex = m.end;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}