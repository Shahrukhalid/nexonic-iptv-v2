import React, { useEffect, useState } from 'react';
import { Channel } from '../types';
import { fetchHistory, clearHistory } from '../services/api';
import { ChannelCard } from '../components/ChannelCard';
import { Player } from '../components/Player';
import { History as HistoryIcon, Trash2, ShieldCheck } from 'lucide-react';

interface HistoryProps {
  onSelectChannel: (channel: Channel) => void;
  activeChannel: Channel | null;
}

export const History: React.FC<HistoryProps> = ({ onSelectChannel, activeChannel }) => {
  const [historyChannels, setHistoryChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchHistory();
      setHistoryChannels(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClear = async () => {
    if (confirm('Clear your entire local watch history?')) {
      await clearHistory();
      setHistoryChannels([]);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-nx-primary" />
            <span>Recently Watched</span>
          </h1>
          <p className="text-xs text-nx-muted flex items-center gap-1.5 mt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Stored 100% locally on your computer. Zero telemetry or external tracking.</span>
          </p>
        </div>

        {historyChannels.length > 0 && (
          <button
            onClick={handleClear}
            className="px-3.5 py-1.5 rounded-xl bg-nx-surface hover:bg-rose-600 hover:text-white border border-nx-border text-nx-muted text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {activeChannel && (
        <div className="w-full max-w-5xl mx-auto">
          <Player channel={activeChannel} />
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-nx-muted">Loading watch history...</div>
      ) : historyChannels.length === 0 ? (
        <div className="py-16 text-center text-nx-muted bg-nx-surface rounded-2xl border border-nx-border p-6">
          <HistoryIcon className="w-12 h-12 text-nx-muted mx-auto mb-3 opacity-40" />
          <h4 className="text-base font-bold text-white mb-1">No watch history yet</h4>
          <p className="text-xs max-w-sm mx-auto">
            Channels you stream will automatically appear here for quick resume.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {historyChannels.map(ch => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              isActive={activeChannel?.id === ch.id}
              onSelect={onSelectChannel}
            />
          ))}
        </div>
      )}
    </div>
  );
};
