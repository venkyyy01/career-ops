'use client';

import { useState, useEffect } from 'react';
import { usePipeline } from '@/lib/context';
import { Card, Input, ActionButton, StatusBadge } from '@/components/ui/features';
import { Modal } from '@/components/ui/modal';
import { Mail, Send, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function FollowupPanel() {
  const { careerOpsPath } = usePipeline();
  const [cadence, setCadence] = useState<any>(null);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [draftModal, setDraftModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [draft, setDraft] = useState<any>(null);
  const [draftType, setDraftType] = useState<'email' | 'linkedin'>('email');
  const [followUpNumber, setFollowUpNumber] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/followup?path=${encodeURIComponent(careerOpsPath)}`);
      const data = await res.json();
      setCadence(data.cadence);
      setFollowUps(data.followUps || []);
    } catch (e) {
      console.error('Failed to load follow-up data');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (careerOpsPath) {
      loadData();
    }
  }, [careerOpsPath]);

  const generateDraft = async () => {
    if (!selectedApp) return;

    try {
      const res = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draft',
          data: {
            company: selectedApp.company,
            role: selectedApp.role,
            status: selectedApp.status,
            followUpNumber,
            channel: draftType
          },
          careerOpsPath
        })
      });

      const data = await res.json();
      setDraft(data);
    } catch (e) {
      console.error('Failed to generate draft');
    }
  };

  const recordFollowUp = async () => {
    if (!draft) return;

    try {
      await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record',
          data: {
            company: selectedApp.company,
            role: selectedApp.role,
            date: new Date().toISOString().split('T')[0],
            channel: draftType,
            message: draft.message
          },
          careerOpsPath
        })
      });

      setDraftModal(false);
      loadData();
    } catch (e) {
      console.error('Failed to record follow-up');
    }
  };

  const openDraftModal = (app: any, type: 'email' | 'linkedin' = 'email') => {
    setSelectedApp(app);
    setDraftType(type);
    setFollowUpNumber(app.followUpNumber || 1);
    setDraft(null);
    setDraftModal(true);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card title="Follow-up Cadence" description="Track and manage your outreach follow-ups">
          <div className="flex gap-3 mb-6">
            <ActionButton onClick={loadData} loading={loading}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </ActionButton>
          </div>

          {cadence && (
            <div className="space-y-6">
              {cadence.urgent && cadence.urgent.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <label className="text-sm font-medium text-red-400">Urgent - Follow up today</label>
                  </div>
                  <div className="space-y-2">
                    {cadence.urgent.map((app: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-200">{app.company}</p>
                          <p className="text-xs text-slate-500">{app.status} - {app.daysSince} days</p>
                        </div>
                        <div className="flex gap-2">
                          <ActionButton size="sm" variant="secondary" onClick={() => openDraftModal(app)}>
                            <Mail className="w-3 h-3" />
                            Email
                          </ActionButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cadence.overdue && cadence.overdue.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <label className="text-sm font-medium text-yellow-400">Overdue - Should have followed up</label>
                  </div>
                  <div className="space-y-2">
                    {cadence.overdue.map((app: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-200">{app.company}</p>
                          <p className="text-xs text-slate-500">{app.status} - {app.daysSince} days</p>
                        </div>
                        <div className="flex gap-2">
                          <ActionButton size="sm" variant="secondary" onClick={() => openDraftModal(app, 'email')}>
                            <Mail className="w-3 h-3" />
                            Email
                          </ActionButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cadence.waiting && cadence.waiting.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <label className="text-sm font-medium text-blue-400">Waiting - On schedule</label>
                  </div>
                  <div className="space-y-2">
                    {cadence.waiting.map((app: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-[#16161e] rounded-lg">
                        <div>
                          <p className="font-medium text-slate-200">{app.company}</p>
                          <p className="text-xs text-slate-500">{app.status} - {app.daysSince} days</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cadence.cold && cadence.cold.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-400 mb-3 block">Cold - No recent activity</label>
                  <div className="space-y-2">
                    {cadence.cold.map((app: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-[#16161e] rounded-lg opacity-60">
                        <div>
                          <p className="font-medium text-slate-300">{app.company}</p>
                          <p className="text-xs text-slate-500">{app.status} - {app.daysSince} days</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {followUps.length > 0 && (
          <Card title="Recent Follow-ups">
            <div className="space-y-2">
              {followUps.slice(0, 10).map((fu: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#16161e] rounded-lg">
                  <Send className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-300 flex-1">{fu.company}</span>
                  <span className="text-xs text-slate-500">{fu.date}</span>
                  <StatusBadge status="idle" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Modal open={draftModal} onClose={() => setDraftModal(false)} title="Generate Follow-up Draft" size="lg">
        <div className="space-y-4">
          <div className="flex gap-4">
        <select
          aria-label="Draft channel"
          value={draftType}
          onChange={e => setDraftType(e.target.value as 'email' | 'linkedin')}
          className="px-4 py-2 bg-[#16161e] border border-[#2a2a38] rounded-xl text-slate-200"
        >
          <option value="email">Email</option>
          <option value="linkedin">LinkedIn</option>
        </select>
        <select
          aria-label="Follow-up number"
          value={followUpNumber}
          onChange={e => setFollowUpNumber(Number(e.target.value))}
          className="px-4 py-2 bg-[#16161e] border border-[#2a2a38] rounded-xl text-slate-200"
        >
              <option value={1}>1st Follow-up</option>
              <option value={2}>2nd Follow-up</option>
              <option value={3}>3rd Follow-up</option>
            </select>
            <ActionButton onClick={generateDraft}>Generate</ActionButton>
          </div>

          {draft && (
            <div className="p-4 bg-[#16161e] rounded-xl">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Draft Message</label>
              <p className="text-slate-300 whitespace-pre-wrap">{draft.message}</p>
              <p className="text-xs text-slate-500 mt-4">Characters: {draft.message.length}</p>
            </div>
          )}

          {draft && (
            <div className="flex gap-3">
              <ActionButton onClick={recordFollowUp}>
                <Send className="w-4 h-4" />
                Record & Mark Sent
              </ActionButton>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}