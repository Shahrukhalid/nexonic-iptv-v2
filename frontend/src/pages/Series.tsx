import React, { useEffect, useState } from 'react';
import { Channel } from '../types';
import { fetchChannels } from '../services/api';
import { ChannelCard } from '../components/ChannelCard';
import { Player } from '../components/Player';
import { Film, Tv, Sparkles, Filter, Search, CheckCircle2, AlertCircle } from 'lucide-react';

interface SeriesProps {
  onSelectChannel: (channel: Channel) => void;
  activeChannel: Channel | null;
}

export const Series: React.FC<SeriesProps> = ({ onSelectChannel, activeChannel }) => {
  const [seriesChannels, setSeriesChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('WORKING'); // Online verified working streams by default
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const loadSeries = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetchChannels({
        is_series: true,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        sort_by: 'working_first',
        page_size: 150
      });
      setSeriesChannels(res.items);
      setTotalCount(res.total);
      const firstWorking = res.items.find(c => c.status === 'WORKING');
      if (showLoading && !activeChannel && firstWorking) {
        onSelectChannel(firstWorking);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadSeries(true);
    // Real-time live auto-sync every 15 seconds
    const interval = setInterval(() => {
      loadSeries(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [statusFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-nx-surface via-indigo-950/40 to-nx-surface border border-nx-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Film className="w-3.5 h-3.5" />
            <span>24/7 Linear Series Broadcasts ({totalCount.toLocaleString()} available)</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">TV Series & Marathons</h1>
          <p className="text-xs text-nx-muted max-w-lg mt-1">
            Enjoy non-stop 24/7 linear television series channels, sitcom marathons, drama series, and classic television.
          </p>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-nx-muted" />
            <input
              type="text"
              placeholder="Search series..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-nx-bg border border-nx-border text-xs text-white placeholder-nx-muted focus:outline-none focus:border-indigo-500 w-40 md:w-52"
            />
          </div>

          {/* Segmented Online / Offline Toggle */}
          <div className="inline-flex rounded-xl bg-nx-bg p-1 border border-nx-border">
            <button
              onClick={() => setStatusFilter('WORKING')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                statusFilter === 'WORKING'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-nx-muted hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Online Only</span>
            </button>
            <button
              onClick={() => setStatusFilter('OFFLINE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                statusFilter === 'OFFLINE'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                  : 'text-nx-muted hover:text-white'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Offline</span>
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-nx-surface text-white border border-nx-border shadow-sm'
                  : 'text-nx-muted hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-indigo-400" />
              <span>All ({totalCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Series Player */}
      {activeChannel && activeChannel.is_series === 1 && (
        <div className="w-full max-w-5xl mx-auto shadow-2xl rounded-2xl overflow-hidden border border-indigo-900/40">
          <Player
            channel={activeChannel}
            onNextWorkingChannel={() => {
              const working = seriesChannels.filter(c => c.status === 'WORKING' && c.id !== activeChannel?.id);
              if (working.length > 0) onSelectChannel(working[0]);
              else if (seriesChannels.length > 1) {
                const other = seriesChannels.filter(c => c.id !== activeChannel?.id);
                if (other.length > 0) onSelectChannel(other[0]);
              }
            }}
          />
        </div>
      )}

      {/* Channels List */}
      {loading ? (
        <div className="py-20 text-center text-nx-muted">Loading TV Series channels...</div>
      ) : seriesChannels.length === 0 ? (
        <div className="py-16 text-center text-nx-muted bg-nx-surface rounded-2xl border border-nx-border p-6">
          <Tv className="w-12 h-12 text-nx-muted mx-auto mb-3 opacity-40" />
          <h4 className="text-base font-bold text-white mb-1">No series channels found in current filter</h4>
          <p className="text-xs max-w-sm mx-auto">
            Try adjusting your search query or filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {seriesChannels.map(ch => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              isActive={activeChannel?.id === ch.id}
              onSelect={onSelectChannel}
              onUpdated={updated => {
                setSeriesChannels(prev => prev.map(c => (c.id === updated.id ? updated : c)));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
