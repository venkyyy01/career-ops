'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  { key: '↑ / ↓', description: 'Navigate' },
  { key: 'Enter', description: 'Open report' },
  { key: 'U', description: 'Open job URL' },
  { key: 'S', description: 'Change sort' },
  { key: 'F', description: 'Filter tabs' },
  { key: 'V', description: 'Toggle view' },
  { key: 'G / G', description: 'Go top/bottom' },
  { key: 'Esc', description: 'Close modal' },
];

export function HelpFooter() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-[#1a1a21] border border-[#2a2a38] rounded-full shadow-lg hover:bg-[#242430] transition-colors z-40"
      >
        <Keyboard className="w-5 h-5 text-slate-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#1a1a21] border border-[#2a2a38] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a38]">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-slate-100">Keyboard Shortcuts</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-200 hover:bg-[#242430] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 grid grid-cols-2 gap-3">
                {SHORTCUTS.map(({ key, description }) => (
                  <div key={key} className="flex items-center gap-3">
                    <kbd className="px-2 py-1 text-xs font-mono bg-[#242430] border border-[#2a2a38] rounded text-slate-300">
                      {key}
                    </kbd>
                    <span className="text-sm text-slate-400">{description}</span>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 bg-[#16161e] border-t border-[#2a2a38]">
                <p className="text-xs text-slate-500 text-center">
                  career-ops by santifer.io
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}