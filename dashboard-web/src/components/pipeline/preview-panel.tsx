'use client';

import { usePipeline } from '@/lib/context';
import { ExternalLink, FileText, Edit3, Check } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { STATUS_OPTIONS } from '@/types/pipeline';

interface PreviewPanelProps {
  onOpenReport?: () => void;
}

export function PreviewPanel({ onOpenReport }: PreviewPanelProps) {
  const { previewApp, reportCache, updateStatus, openJobURL } = usePipeline();
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  if (!previewApp) {
    return (
      <div className="w-96 border-l border-[#2a2a38] bg-[#16161e] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1a1a21] flex items-center justify-center">
            <FileText className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-sm text-slate-500">Select an application</p>
        </div>
      </div>
    );
  }

  const summary = previewApp.reportPath ? reportCache[previewApp.reportPath] : null;

  const handleStatusChange = async () => {
    if (newStatus && previewApp.reportNumber) {
      await updateStatus(previewApp.reportNumber, newStatus);
      setStatusModalOpen(false);
    }
  };

  return (
    <>
      <div className="w-96 border-l border-[#2a2a38] bg-[#16161e] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#2a2a38]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">{previewApp.company}</h3>
              <p className="text-sm text-slate-400">{previewApp.role}</p>
            </div>
            <div className={`text-2xl font-bold ${previewApp.score > 0 ? (previewApp.score >= 4.2 ? 'text-emerald-400' : previewApp.score >= 3.8 ? 'text-yellow-400' : 'text-slate-300') : 'text-slate-600'}`}>
              {previewApp.score > 0 ? previewApp.score.toFixed(1) : '—'}
              <span className="text-sm text-slate-500">/5</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#242430] text-slate-300">
              {previewApp.status.replace(/\*\*/g, '')}
            </span>
            {previewApp.date && (
              <span className="text-xs text-slate-500">{previewApp.date}</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {summary ? (
            <>
              {summary.archetype && (
                <div>
                    <label className="text-xs font-medium text-sky-400 uppercase tracking-wider">Archetype</label>
                  <p className="mt-1 text-sm text-slate-200">{summary.archetype}</p>
                </div>
              )}

              {summary.tldr && (
                <div>
                  <label className="text-xs font-medium text-sky-400 uppercase tracking-wider">TL;DR</label>
                  <p className="mt-1 text-sm text-slate-300 leading-relaxed">{summary.tldr}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {summary.comp && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Comp</label>
                    <p className="mt-0.5 text-sm text-yellow-400 font-medium">{summary.comp}</p>
                  </div>
                )}
                {summary.remote && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Remote</label>
                    <p className="mt-0.5 text-sm text-slate-300">{summary.remote}</p>
                  </div>
                )}
              </div>
            </>
          ) : previewApp.notes ? (
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Notes</label>
              <p className="mt-1 text-sm text-slate-400">{previewApp.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="p-4 border-t border-[#2a2a38] space-y-2">
          <div className="flex gap-2">
            {previewApp.jobURL && (
              <button
                onClick={() => openJobURL(previewApp.jobURL)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#242430] hover:bg-[#2a2a38] text-slate-200 text-sm font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Job URL
              </button>
            )}
            {previewApp.reportPath && (
              <button
                onClick={onOpenReport}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-400/20 hover:bg-blue-400/30 text-blue-400 text-sm font-medium rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Report
              </button>
            )}
          </div>

          <button
            onClick={() => { setNewStatus(previewApp.status); setStatusModalOpen(true); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#242430] hover:bg-[#2a2a38] text-slate-200 text-sm font-medium rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Change Status
          </button>
        </div>
      </div>

      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Change Status"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            value={newStatus}
            onChange={setNewStatus}
            options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setStatusModalOpen(false)}
              className="flex-1 px-4 py-2 bg-[#242430] hover:bg-[#2a2a38] text-slate-200 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStatusChange}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-400 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}