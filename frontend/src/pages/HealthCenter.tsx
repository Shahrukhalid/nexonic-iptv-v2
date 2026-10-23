import React, { useEffect, useState } from 'react';
import { VerificationProgress, Channel } from '../types';
import {
  fetchVerificationStats,
  startBatchVerification,
  pauseVerification,
  resumeVerification,
  cancelVerification,
  fetchChannels
} from '../services/api';
import { ChannelCard } from '../components/ChannelCard';
import {
  Activity,
  Play,
  Pause,
  XOctagon,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldAlert,
  Clock,
  Filter
} from 'lucide-react';

interface HealthCenterProps {
  onSelectChannel: (channel: Channel) => void;
}

export const HealthCenter: React.FC<HealthCenterProps> = ({ onSelectChannel }) => {
  const [stats, setStats] = useState<VerificationProgress | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('WORKING');
  const [loading, setLoading] = useState(true);

  // Poll progress while testing is running
  useEffect(() => {
    let interval: any = null;

    async function loadStats() {
      try {
        const s = await fetchVerificationStats();
        setStats(s);
        if (s.is_running && !interval) {
          interval = setInterval(async () => {
            const updated = await fetchVerificationStats();
            setStats(updated);
            if (!updated.is_running && interval) {
              clearInterval(interval);
              interval = null;
            }
          }, 1500);
        }
      } catch (e) {
        console.error(e);
      }
    }

    loadStats();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Load sample channels according to filter
  useEffect(() => {
    async function loadChannels() {
      setLoading(true);
      try {
        const res = await fetchChannels({
          status: filterStatus === 'ALL' ? undefined : filterStatus,
          page_size: 40
        });
        setChannels(res.items);
      } finally {
        setLoading(false);
      }
    }
    loadChannels();
  }, [filterStatus]);

  const handleStartBatch = async (scope: string) => {
    await startBatchVerification(scope, 200);
    const s = await fetchVerificationStats();
    setStats(s);
  };

  const handlePause = async () => {
    await pauseVerification();
    const s = await fetchVerificationStats();
    setStats(s);
  };

  const handleResume = async () => {
    await resumeVerification();
    const s = await fetchVerificationStats();
    setStats(s);
  };

  const handleCancel = async () => {
    await cancelVerification();
    const s = await fetchVerificationStats();
    setStats(s);
  };

  const percentComplete = stats?.total_queued
    ? Math.round((stats.completed / stats.total_queued) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            <span>Smart Channel Health Dashboard</span>
          </h1>
          <p className="text-xs text-nx-muted">
            Real multi-level stream testing: HTTP handshake, HLS manifests, media segments, and FFprobe video codecs
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={`/api/verification/export/csv`}
            download
            className="px-3.5 py-1.5 rounded-xl bg-nx-surface border border-nx-border hover:border-white text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-nx-primary" />
            <span>Export CSV</span>
          </a>
          <a
            href={`/api/verification/export/json`}
            download
            className="px-3.5 py-1.5 rounded-xl bg-nx-surface border border-nx-border hover:border-white text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-nx-accent" />
            <span>Export JSON</span>
          </a>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-nx-surface border border-nx-border">
          <span className="text-[10px] text-nx-muted uppercase font-bold tracking-wider block mb-1">Total Streams</span>
          <span className="text-xl font-bold text-white">{stats?.total_channels || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block mb-1">Working</span>
          <span className="text-xl font-bold text-emerald-400">{stats?.working || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block mb-1">Unstable</span>
          <span className="text-xl font-bold text-amber-400">{stats?.unstable || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider block mb-1">Offline</span>
          <span className="text-xl font-bold text-rose-400">{stats?.offline || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
          <span className="text-[10px] text-purple-400 uppercase font-bold tracking-wider block mb-1">Restricted</span>
          <span className="text-xl font-bold text-purple-400">{stats?.restricted || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-500/10 border border-slate-500/20">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Unverified</span>
          <span className="text-xl font-bold text-slate-400">{stats?.unverified || 0}</span>
        </div>
      </div>

      {/* Live Testing Control Panel */}
      <div className="p-6 rounded-2xl bg-nx-surface border border-nx-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${stats?.is_running ? 'bg-emerald-400 animate-ping' : 'bg-nx-muted'}`} />
              <span>{stats?.is_running ? 'Testing In Progress...' : 'Stream Verification Engine'}</span>
            </h3>
            <p className="text-xs text-nx-muted">
              {stats?.is_running
                ? `Testing ${stats.completed} of ${stats.total_queued} channels (Working: ${stats.working}, Failed: ${stats.failed})`
                : 'Select an automated testing batch to run in the background with local concurrency.'}
            </p>
          </div>

          {/* Action Triggers */}
          <div className="flex flex-wrap items-center gap-2">
            {!stats?.is_running ? (
              <>
                <button
                  onClick={() => handleStartBatch('unverified')}
                  className="px-4 py-2 rounded-xl bg-nx-primary hover:bg-nx-primary-hover text-white text-xs font-bold transition-all shadow-glow-blue"
                >
                  Test Unverified (Next 200)
                </button>
                <button
                  onClick={() => handleStartBatch('failed')}
                  className="px-4 py-2 rounded-xl bg-nx-card border border-nx-border hover:border-rose-400 text-rose-300 text-xs font-semibold transition-colors"
                >
                  Retest Failed Channels
                </button>
                <button
                  onClick={() => handleStartBatch('all')}
                  className="px-4 py-2 rounded-xl bg-nx-card border border-nx-border hover:border-white text-white text-xs font-semibold transition-colors"
                >
                  Test All Channels
                </button>
              </>
            ) : (
              <>
                {stats.is_paused ? (
                  <button
                    onClick={handleResume}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Pause</span>
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <XOctagon className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar (when running) */}
        {stats?.is_running && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-nx-muted">
              <span>{percentComplete}% Completed</span>
              <span>{stats.completed} / {stats.total_queued} Streams</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-nx-bg overflow-hidden border border-nx-border">
              <div
                className="h-full bg-gradient-to-r from-nx-primary to-emerald-400 transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filter Tested Channels List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-nx-primary" />
            <span>Inspect Channels By Status</span>
          </h3>

          <div className="flex items-center gap-1.5">
            {['WORKING', 'UNSTABLE', 'OFFLINE', 'REGION RESTRICTED', 'UNVERIFIED', 'ALL'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                  filterStatus === st
                    ? 'bg-nx-primary text-white'
                    : 'bg-nx-surface text-nx-muted hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-nx-muted">Loading channels...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {channels.map(channel => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onSelect={onSelectChannel}
                onUpdated={up => {
                  setChannels(prev => prev.map(c => (c.id === up.id ? up : c)));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
