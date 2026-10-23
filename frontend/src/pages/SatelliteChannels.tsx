import React, { useEffect, useState, useMemo } from 'react';
import { Channel, SatelliteStat } from '../types';
import { fetchChannels, fetchSatelliteStats, startBatchVerification } from '../services/api';
import { ChannelCard } from '../components/ChannelCard';
import { Player } from '../components/Player';
import {
  Radio,
  Search,
  Filter,
  ArrowUpDown,
  Tv,
  Sparkles,
  Zap,
  Globe2,
  CheckCircle2,
  AlertCircle,
  SignalHigh
} from 'lucide-react';

interface SatelliteChannelsProps {
  onSelectChannel: (channel: Channel) => void;
  activeChannel: Channel | null;
  searchQuery?: string;
}

export const SatelliteChannels: React.FC<SatelliteChannelsProps> = ({
  onSelectChannel,
  activeChannel,
  searchQuery = ''
}) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [satelliteNetworks, setSatelliteNetworks] = useState<SatelliteStat[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('WORKING');
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [sortBy, setSortBy] = useState('working_first');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPinging, setIsPinging] = useState(false);

  const handlePingBatch = async () => {
    if (channels.length === 0) return;
    setIsPinging(true);
    try {
      await startBatchVerification('all', 48);
      alert('Live stream check started across visible satellite transponders! Statuses will auto-update.');
    } finally {
      setIsPinging(false);
    }
  };

  // Sync external search query
  useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchTerm(searchQuery);
      setPage(1);
    }
  }, [searchQuery]);

  // Load satellite network statistics with live auto-sync
  useEffect(() => {
    const refreshSatStats = () => {
      fetchSatelliteStats()
        .then(stats => {
          const sorted = [...stats].sort((a, b) => b.count - a.count);
          setSatelliteNetworks(sorted);
        })
        .catch(() => {});
    };
    refreshSatStats();
    const interval = setInterval(refreshSatStats, 15000);
    return () => clearInterval(interval);
  }, []);

  // Load channels when filters change
  useEffect(() => {
    async function loadSatelliteChannels() {
      setLoading(true);
      try {
        const res = await fetchChannels({
          is_satellite: true,
          satellite_network: selectedNetwork !== 'ALL' ? selectedNetwork : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          search: searchTerm ? searchTerm : undefined,
          sort_by: sortBy,
          page,
          page_size: 48
        });
        setChannels(res.items);
        setTotalPages(res.total_pages);
        setTotalCount(res.total);
        const firstWorking = res.items.find(c => c.status === 'WORKING');
        if (!activeChannel && firstWorking) {
          onSelectChannel(firstWorking);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSatelliteChannels();
  }, [selectedNetwork, selectedStatus, searchTerm, sortBy, page]);

  const totalWorkingAcrossSat = useMemo(() => {
    return satelliteNetworks.reduce((acc, curr) => acc + (curr.working || 0), 0);
  }, [satelliteNetworks]);

  const totalChannelsAcrossSat = useMemo(() => {
    return satelliteNetworks.reduce((acc, curr) => acc + (curr.count || 0), 0);
  }, [satelliteNetworks]);

  return (
    <div className="space-y-6 pb-12">
      {/* Satellite Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-sky-950/70 via-nx-surface to-indigo-950/60 border border-sky-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-xs font-semibold mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Worldwide Dish & Satellite TV (FTA / DVB-S2)</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Dish & Satellite Digital Television</h1>
          <p className="text-xs text-nx-muted max-w-xl mt-1">
            Free-to-air (FTA) satellite channels from your sources, grouped by satellite network.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-nx-bg/80 border border-nx-border p-3 rounded-2xl">
          <div className="text-center px-2">
            <span className="block text-lg font-extrabold text-white">{totalChannelsAcrossSat || totalCount}</span>
            <span className="text-[10px] text-nx-muted uppercase tracking-wider">Satellite Channels</span>
          </div>
          <div className="w-px h-8 bg-nx-border" />
          <div className="text-center px-2">
            <span className="block text-lg font-extrabold text-emerald-400">{totalWorkingAcrossSat}</span>
            <span className="text-[10px] text-emerald-400/80 uppercase tracking-wider">Verified Active</span>
          </div>
        </div>
      </div>

      {/* Satellite Constellations & Networks Filter Bar */}
      <div className="p-4 rounded-2xl bg-nx-surface/80 border border-nx-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
            <SignalHigh className="w-4 h-4 text-sky-400" />
            <span>Satellite Orbital Position / Network:</span>
          </div>
          <select
            value={selectedNetwork}
            onChange={(e) => {
              setSelectedNetwork(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-xl bg-nx-bg border border-nx-border hover:border-sky-500 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer min-w-[280px] sm:min-w-[360px]"
          >
            <option value="ALL">All Satellite Constellations & Networks ({totalChannelsAcrossSat || totalCount} channels)</option>
            {satelliteNetworks.map(sat => (
              <option key={sat.network} value={sat.network}>
                🛰️ {sat.network} — {sat.count} channels ({sat.working} active)
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-nx-muted flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-medium">
            {satelliteNetworks.length} orbital networks available
          </span>
        </div>
      </div>

      {/* Secondary Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-nx-surface/70 border border-nx-border">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-nx-muted" />
            <input
              type="text"
              placeholder="Search satellite channels..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-nx-bg border border-nx-border text-xs text-white placeholder-nx-muted focus:outline-none focus:border-sky-500 w-48 sm:w-64"
            />
          </div>

          {/* Segmented Online / Offline Toggle */}
          <div className="inline-flex rounded-xl bg-nx-bg p-1 border border-nx-border">
            <button
              onClick={() => { setSelectedStatus('WORKING'); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedStatus === 'WORKING'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-nx-muted hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Online ({totalWorkingAcrossSat})</span>
            </button>
            <button
              onClick={() => { setSelectedStatus('OFFLINE'); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedStatus === 'OFFLINE'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                  : 'text-nx-muted hover:text-white'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Offline</span>
            </button>
            <button
              onClick={() => { setSelectedStatus('ALL'); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedStatus === 'ALL'
                  ? 'bg-nx-surface text-white border border-nx-border shadow-sm'
                  : 'text-nx-muted hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-sky-400" />
              <span>All ({totalChannelsAcrossSat})</span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 pl-2 border-l border-nx-border/60">
            <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
            <select
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-nx-bg border border-nx-border text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
            >
              <option value="working_first">Verified Working First</option>
              <option value="name_asc">Alphabetical (A to Z)</option>
              <option value="name_desc">Alphabetical (Z to A)</option>
              <option value="fastest">Lowest Latency</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePingBatch}
            disabled={isPinging || channels.length === 0}
            className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 hover:border-sky-500 text-sky-400 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Ping and audit active status of visible satellite streams"
          >
            <Zap className={`w-3.5 h-3.5 ${isPinging ? 'animate-pulse text-amber-400' : 'text-sky-400'}`} />
            <span>{isPinging ? 'Pinging...' : 'Ping & Audit Streams'}</span>
          </button>
          <div className="text-xs text-nx-muted font-medium ml-1">
            Showing <span className="text-white font-bold">{channels.length}</span> of <span className="text-white font-bold">{totalCount}</span> channels
          </div>
        </div>
      </div>

      {/* Active Satellite Player */}
      {activeChannel && (
        <div className="w-full max-w-5xl mx-auto shadow-2xl rounded-2xl overflow-hidden border border-sky-900/40">
          <Player
            channel={activeChannel}
            onNextWorkingChannel={() => {
              const working = channels.filter(c => c.status === 'WORKING' && c.id !== activeChannel?.id);
              if (working.length > 0) onSelectChannel(working[0]);
              else if (channels.length > 1) {
                const other = channels.filter(c => c.id !== activeChannel?.id);
                if (other.length > 0) onSelectChannel(other[0]);
              }
            }}
          />
        </div>
      )}

      {/* Satellite Channels Grid */}
      {loading ? (
        <div className="py-20 text-center text-nx-muted">Tuning satellite feeds & transponders...</div>
      ) : channels.length === 0 ? (
        <div className="py-16 text-center text-nx-muted bg-nx-surface rounded-2xl border border-nx-border p-6">
          <Tv className="w-12 h-12 text-nx-muted mx-auto mb-3 opacity-40" />
          <h4 className="text-base font-bold text-white mb-1">No satellite channels found for this filter</h4>
          <p className="text-xs max-w-sm mx-auto mb-4">
            Try resetting your search query or select "All Satellite Channels" to browse all orbital networks.
          </p>
          <button
            onClick={() => {
              setSelectedNetwork('ALL');
              setSelectedStatus('ALL');
              setSearchTerm('');
            }}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-500"
          >
            Reset Satellite Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {channels.map(ch => (
              <ChannelCard
                key={ch.id}
                channel={ch}
                isActive={activeChannel?.id === ch.id}
                onSelect={onSelectChannel}
                onUpdated={updated => {
                  setChannels(prev => prev.map(c => (c.id === updated.id ? updated : c)));
                }}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl bg-nx-surface border border-nx-border text-xs text-white disabled:opacity-40 hover:bg-nx-card"
              >
                Previous
              </button>
              <span className="text-xs text-nx-muted px-2">
                Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-xl bg-nx-surface border border-nx-border text-xs text-white disabled:opacity-40 hover:bg-nx-card"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
