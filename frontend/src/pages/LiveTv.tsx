import React, { useEffect, useState } from 'react';
import { Channel, CountryStat, CategoryStat } from '../types';
import { ChannelCard } from '../components/ChannelCard';
import { Player } from '../components/Player';
import {
  Filter,
  Tv,
  RotateCcw,
  Search,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Activity
} from 'lucide-react';
import {
  fetchChannels,
  fetchCountryStats,
  fetchCategoryStats,
  startBatchVerification,
  fetchAutoCheckConfig,
  setAutoCheckInterval
} from '../services/api';

interface LiveTvProps {
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  initialFilter?: { country?: string; category?: string; status?: string };
  searchQuery?: string;
}

export const LiveTv: React.FC<LiveTvProps> = ({
  activeChannel,
  onSelectChannel,
  initialFilter,
  searchQuery }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [countries, setCountries] = useState<CountryStat[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);

  // Filter states
  const [selectedCountry, setSelectedCountry] = useState<string>(initialFilter?.country || 'ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialFilter?.category || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilter?.status || 'WORKING'); // Online working streams by default
  const [streamType, setStreamType] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('working_first'); // Verified Working First by default!
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [testingBatch, setTestingBatch] = useState(false);

  useEffect(() => {
    if (initialFilter?.country) setSelectedCountry(initialFilter.country);
    if (initialFilter?.category) setSelectedCategory(initialFilter.category);
    if (initialFilter?.status) setSelectedStatus(initialFilter.status);
  }, [initialFilter]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Auto-Check state
  const [autoCheckIntervalSecs, setAutoCheckIntervalSecs] = useState<number>(30);
  const [autoCheckActive, setAutoCheckActive] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(30);

  useEffect(() => {
    fetchAutoCheckConfig().then(cfg => {
      setAutoCheckIntervalSecs(cfg.interval_seconds);
      setAutoCheckActive(cfg.is_enabled);
      setCountdown(cfg.interval_seconds || 30);
    }).catch(() => {});
  }, []);

  // Live Auto-Check Heartbeat Timer
  useEffect(() => {
    if (!autoCheckActive || autoCheckIntervalSecs <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Trigger refresh of visible channels & verification stats
          fetchChannels({
            country: selectedCountry,
            category: selectedCategory,
            status: selectedStatus,
            search: searchQuery?.trim() || undefined,
            is_favorite: onlyFavorites ? true : undefined,
            is_live: streamType === 'LIVE' ? true : streamType === 'OFFLINE_VOD' ? false : undefined,
            is_vod: streamType === 'OFFLINE_VOD' ? true : undefined,
            sort_by: sortBy,
            page,
            page_size: 48
          }).then(res => {
            setChannels(res.items);
            setTotalPages(res.total_pages);
            setTotalCount(res.total);
          }).catch(() => {});

          return autoCheckIntervalSecs;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoCheckActive, autoCheckIntervalSecs, selectedCountry, selectedCategory, selectedStatus, streamType, sortBy, onlyFavorites, page, searchQuery]);

  // Load countries & categories for filters with live auto-sync
  useEffect(() => {
    const refreshFilters = () => {
      fetchCountryStats().then(setCountries).catch(() => {});
      fetchCategoryStats().then(setCategories).catch(() => {});
    };
    refreshFilters();
    const interval = setInterval(refreshFilters, 15000);
    return () => clearInterval(interval);
  }, []);

  // Load channels when filters change
  useEffect(() => {
    async function loadChannels() {
      setLoading(true);
      try {
        const res = await fetchChannels({
          country: selectedCountry,
          category: selectedCategory,
          status: selectedStatus,
          search: searchQuery?.trim() || undefined,
          is_favorite: onlyFavorites ? true : undefined,
          is_live: streamType === 'LIVE' ? true : streamType === 'OFFLINE_VOD' ? false : undefined,
          is_vod: streamType === 'OFFLINE_VOD' ? true : undefined,
          sort_by: sortBy,
          page,
          page_size: 48
        });
        setChannels(res.items);
        setTotalPages(res.total_pages);
        setTotalCount(res.total);

        // Auto select first confirmed working channel if none is currently selected
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
    loadChannels();
  }, [selectedCountry, selectedCategory, selectedStatus, streamType, sortBy, onlyFavorites, page, searchQuery]);

  const handleChannelUpdated = (updated: Channel) => {
    setChannels(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  };

  // Alphabetically sorted dropdown items
  const sortedCountries = [...countries].sort((a, b) => a.country.localeCompare(b.country));
  const sortedCategories = [...categories].sort((a, b) => a.category.localeCompare(b.category));

  const handleTestVisibleBatch = async () => {
    if (channels.length === 0) return;
    setTestingBatch(true);
    try {
      await startBatchVerification('unverified', 48);
      alert('Started real verification batch on visible channels. Check Channel Health Center for live progress!');
    } finally {
      setTestingBatch(false);
    }
  };

  const handleNextWorkingChannel = () => {
    const workingChannels = channels.filter(c => c.status === 'WORKING' && c.id !== activeChannel?.id);
    if (workingChannels.length > 0) {
      onSelectChannel(workingChannels[0]);
    } else if (channels.length > 1) {
      const other = channels.filter(c => c.id !== activeChannel?.id);
      if (other.length > 0) onSelectChannel(other[0]);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Active Stream Player at Top */}
      <div className="w-full max-w-5xl mx-auto">
        <Player channel={activeChannel} onNextWorkingChannel={handleNextWorkingChannel} />
      </div>

      {/* Online / Offline Quick Status Bar & Auto-Check Pulsing Heartbeat */}
      <div className="p-3.5 rounded-2xl bg-nx-surface/90 border border-nx-border flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5 mr-1">
            <Activity className="w-4 h-4 text-nx-primary" />
            <span>Channel Health Status:</span>
          </span>
          <div className="inline-flex rounded-xl bg-nx-bg p-1 border border-nx-border">
            <button
              onClick={() => { setSelectedStatus('WORKING'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedStatus === 'WORKING'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-nx-muted hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Online Channels</span>
            </button>
            <button
              onClick={() => { setSelectedStatus('OFFLINE'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedStatus === 'OFFLINE'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                  : 'text-nx-muted hover:text-white'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Offline Channels</span>
            </button>
            <button
              onClick={() => { setSelectedStatus('ALL'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedStatus === 'ALL'
                  ? 'bg-nx-surface text-white border border-nx-border shadow-sm'
                  : 'text-nx-muted hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-sky-400" />
              <span>All ({totalCount})</span>
            </button>
          </div>
        </div>

        {/* Auto-Check Controls (Every 30s) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-nx-bg border border-nx-border">
            <div className="relative flex items-center justify-center">
              <span className={`w-2.5 h-2.5 rounded-full ${autoCheckActive && autoCheckIntervalSecs > 0 ? 'bg-emerald-400 animate-ping' : 'bg-nx-muted'}`} />
              <span className={`w-2 h-2 rounded-full absolute ${autoCheckActive && autoCheckIntervalSecs > 0 ? 'bg-emerald-400' : 'bg-nx-muted'}`} />
            </div>
            <span className="text-xs font-medium text-white flex items-center gap-1">
              <span>Auto-Check:</span>
              <strong className="text-emerald-400 font-mono">
                {autoCheckActive && autoCheckIntervalSecs > 0 ? `${countdown}s` : 'OFF'}
              </strong>
            </span>
            <select
              value={autoCheckIntervalSecs}
              onChange={async (e) => {
                const val = Number(e.target.value);
                setAutoCheckIntervalSecs(val);
                setAutoCheckActive(val > 0);
                setCountdown(val);
                await setAutoCheckInterval(val);
              }}
              className="bg-nx-surface text-[11px] text-white px-2 py-0.5 rounded-lg border border-nx-border focus:outline-none cursor-pointer"
            >
              <option value={30}>Every 30s</option>
              <option value={60}>Every 1m</option>
              <option value={300}>Every 5m</option>
              <option value={0}>Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter & Sort Toolbar */}
      <div className="p-4 rounded-2xl bg-nx-surface border border-nx-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 text-xs font-bold text-white">
            <Filter className="w-4 h-4 text-nx-primary" />
            <span>Filter:</span>
          </div>

          {/* Alphabetical Country Filter */}
          <select
            value={selectedCountry}
            onChange={e => {
              setSelectedCountry(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-nx-bg border border-nx-border text-xs text-white focus:outline-none focus:border-nx-primary cursor-pointer"
          >
            <option value="ALL">All Countries ({sortedCountries.length})</option>
            {sortedCountries.map(c => (
              <option key={c.country_code} value={c.country_code}>
                {c.country_flag} {c.country} ({c.total})
              </option>
            ))}
          </select>

          {/* Alphabetical Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-nx-bg border border-nx-border text-xs text-white focus:outline-none focus:border-nx-primary cursor-pointer"
          >
            <option value="ALL">All Categories (A–Z)</option>
            {sortedCategories.map(cat => (
              <option key={cat.category} value={cat.category}>
                {cat.category} ({cat.count})
              </option>
            ))}
          </select>

          {/* Stream Mode Filter (Live vs Offline & VOD) */}
          <select
            value={streamType}
            onChange={e => {
              setStreamType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-nx-bg border border-nx-border text-xs text-white focus:outline-none focus:border-nx-primary cursor-pointer font-medium"
          >
            <option value="ALL">📺 All Types (Live & Offline)</option>
            <option value="LIVE">📡 Live Streams Only</option>
            <option value="OFFLINE_VOD">📼 Offline & VOD Only</option>
          </select>

          {/* Health Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-nx-bg border border-nx-border text-xs text-white focus:outline-none focus:border-nx-primary cursor-pointer"
          >
            <option value="ALL">All Health Statuses</option>
            <option value="WORKING">🟢 Working Only</option>
            <option value="UNSTABLE">🟠 Unstable Only</option>
            <option value="OFFLINE">🔴 Offline Only</option>
            <option value="REGION RESTRICTED">🟣 Region Restricted</option>
            <option value="UNVERIFIED">⚪ Unverified Only</option>
          </select>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 pl-2 border-l border-nx-border/60">
            <ArrowUpDown className="w-3.5 h-3.5 text-nx-accent" />
            <select
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-nx-bg border border-nx-border text-xs text-white focus:outline-none focus:border-nx-accent cursor-pointer font-medium"
            >
              <option value="name_asc">Alphabetical (A to Z)</option>
              <option value="name_desc">Alphabetical (Z to A)</option>
              <option value="working_first">Verified Working First</option>
              <option value="country_asc">Sort by Country (A-Z)</option>
              <option value="fastest">Lowest Latency First</option>
              <option value="default">Default Order</option>
            </select>
          </div>

          {/* Favorites Filter */}
          <button
            onClick={() => {
              setOnlyFavorites(!onlyFavorites);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              onlyFavorites
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-nx-bg border-nx-border text-nx-muted hover:text-white'
            }`}
          >
            ★ Favorites Only
          </button>
        </div>

        {/* Quick Batch Test & Reset Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestVisibleBatch}
            disabled={testingBatch || channels.length === 0}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Ping and audit active status of visible streams"
          >
            <Zap className={`w-3.5 h-3.5 ${testingBatch ? 'animate-pulse text-amber-400' : 'text-emerald-400'}`} />
            <span>{testingBatch ? 'Pinging...' : 'Ping & Audit Streams'}</span>
          </button>

          {(selectedCountry !== 'ALL' || selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || onlyFavorites || sortBy !== 'name_asc') && (
            <button
              onClick={() => {
                setSelectedCountry('ALL');
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
                setSortBy('name_asc');
                setOnlyFavorites(false);
                setPage(1);
              }}
              className="text-xs text-nx-primary hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <span className="text-xs text-nx-muted font-medium ml-1">
            <strong className="text-white">{totalCount}</strong> channels
          </span>
        </div>
      </div>

      {/* Channel Grid */}
      {loading ? (
        <div className="py-20 text-center text-nx-muted animate-pulse">Loading channels catalog...</div>
      ) : channels.length === 0 ? (
        <div className="py-16 text-center text-nx-muted bg-nx-surface rounded-2xl border border-nx-border p-6">
          <Tv className="w-12 h-12 text-nx-muted mx-auto mb-3 opacity-40" />
          <h4 className="text-base font-bold text-white mb-1">No channels found</h4>
          <p className="text-xs max-w-sm mx-auto mb-4">
            No channels match your selected filter criteria. Try resetting filters or selecting another country.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {channels.map(channel => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              isActive={activeChannel?.id === channel.id}
              onSelect={onSelectChannel}
              onUpdated={handleChannelUpdated}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl bg-nx-surface border border-nx-border text-xs font-semibold text-white disabled:opacity-40 hover:border-nx-primary transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-nx-muted px-2">
            Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({totalCount} Channels)
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl bg-nx-surface border border-nx-border text-xs font-semibold text-white disabled:opacity-40 hover:border-nx-primary transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
