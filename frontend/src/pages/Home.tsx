import React, { useEffect, useState, useRef } from 'react';
import { Channel, CountryStat, CategoryStat, VerificationProgress, StatsSummary } from '../types';
import {
  fetchChannels,
  fetchCountryStats,
  fetchCategoryStats,
  fetchVerificationStats,
  fetchStatsSummary,
  fetchHistory,
  clearHistory,
  autoDiscoverChannels,
  startAutoAudit,
  stopAutoAudit,
  fetchAutoAuditStatus
} from '../services/api';
import { ChannelCard } from '../components/ChannelCard';
import {
  Tv,
  Play,
  Globe2,
  Film,
  CheckCircle2,
  Activity,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Cast,
  Radio,
  Compass,
  Trash2,
  XCircle,
  AlertCircle,
  Zap,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  Pause,
  Gauge
} from 'lucide-react';

interface HomeProps {
  onSelectChannel: (channel: Channel) => void;
  onNavigate: (tab: any, filter?: any) => void;
  onOpenConnectTv: () => void;
}

export const Home: React.FC<HomeProps> = ({
  onSelectChannel,
  onNavigate,
  onOpenConnectTv }) => {
  const [featuredChannels, setFeaturedChannels] = useState<Channel[]>([]);
  const [recentChannels, setRecentChannels] = useState<Channel[]>([]);
  const [countries, setCountries] = useState<CountryStat[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [stats, setStats] = useState<VerificationProgress | null>(null);
  const [statsSummary, setStatsSummary] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<string | null>(null);
  const [isAutoAuditing, setIsAutoAuditing] = useState(true);
  const [auditToggling, setAuditToggling] = useState(false);

  const loadData = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      const [featRes, histRes, countRes, catRes, statRes, summaryRes] = await Promise.all([
        fetchChannels({ status: 'WORKING', page_size: 8 }),
        fetchHistory(),
        fetchCountryStats(),
        fetchCategoryStats(),
        fetchVerificationStats(),
        fetchStatsSummary()
      ]);

      if (featRes.items.length === 0) {
        const fallbackRes = await fetchChannels({ page_size: 8 });
        setFeaturedChannels(fallbackRes.items);
      } else {
        setFeaturedChannels(featRes.items);
      }

      setRecentChannels(histRes.slice(0, 6));
      setCountries(countRes.slice(0, 8));
      setCategories(catRes.slice(0, 8));
      setStats(statRes);
      setStatsSummary(summaryRes);
      if (summaryRes.is_auto_audit_active !== undefined) {
        setIsAutoAuditing(summaryRes.is_auto_audit_active);
      }
    } catch (e) {
      console.error('Home load error:', e);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    // Dynamic polling interval: every 3s during active verification/discovery, 7s when idle
    const pollInterval = isAutoAuditing || isDiscovering ? 3000 : 7000;
    const interval = setInterval(() => {
      loadData(false);
    }, pollInterval);
    return () => clearInterval(interval);
  }, [isAutoAuditing, isDiscovering]);

  const handleAutoDiscover = async () => {
    try {
      setIsDiscovering(true);
      setDiscoveryResult('Scanning worldwide public sources, transponders & directories...');
      const res = await autoDiscoverChannels();
      setDiscoveryResult(`Discovered ${res.new_channels_added} new channels (${res.total_channels} total in database)! Auto-audit started.`);
      setIsAutoAuditing(true);
      await loadData(false);
      setTimeout(() => setDiscoveryResult(null), 7000);
    } catch (e: any) {
      setDiscoveryResult(`Discovery error: ${e.message}`);
      setTimeout(() => setDiscoveryResult(null), 5000);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleToggleAutoAudit = async () => {
    try {
      setAuditToggling(true);
      if (isAutoAuditing) {
        await stopAutoAudit();
        setIsAutoAuditing(false);
      } else {
        await startAutoAudit();
        setIsAutoAuditing(true);
      }
      await loadData(false);
    } catch (e) {
      console.error('Toggle auto-audit error:', e);
    } finally {
      setAuditToggling(false);
    }
  };

  // Compute stream health metrics
  const totalChannels = statsSummary?.total_channels || stats?.total_channels || 0;
  const workingChannels = statsSummary?.working_channels || stats?.working || 0;
  const offlineChannels = statsSummary?.offline_channels || stats?.offline || 0;
  const unverifiedChannels = statsSummary?.unverified_channels || stats?.unverified || 0;
  const testedCount = workingChannels + offlineChannels;
  const healthRate = statsSummary?.online_rate_percent ?? (testedCount > 0 ? Math.round((workingChannels / testedCount) * 1000) / 10 : 0);

  // Width percentages for the health bar
  const pctWorking = totalChannels > 0 ? (workingChannels / totalChannels) * 100 : 0;
  const pctOffline = totalChannels > 0 ? (offlineChannels / totalChannels) * 100 : 0;
  const pctUnverified = totalChannels > 0 ? (unverifiedChannels / totalChannels) * 100 : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-nx-border bg-gradient-to-r from-nx-surface via-nx-card to-[#120E2E] p-6 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-nx-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 w-80 h-80 bg-nx-accent/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nx-primary/10 border border-nx-primary/30 text-nx-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-nx-primary animate-spin" />
            <span>100% Local Worldwide Streaming Engine</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Worldwide Live TV. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-nx-primary via-sky-400 to-nx-accent">
              Zero Cloud. Zero Limits.
            </span>
          </h1>

          <p className="text-sm md:text-base text-nx-muted leading-relaxed">
            Nexonic IPTV v2 discovers, tests, and streams worldwide television channels, Free-To-Air Dish & Satellite networks, and 24/7 TV series locally on your computer and connects seamlessly to your Smart TV via Xtream Codes.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('livetv', { status: 'WORKING' })}
              className="px-5 py-2.5 rounded-xl bg-nx-primary hover:bg-nx-primary-hover text-white text-sm font-bold flex items-center gap-2 shadow-glow-blue transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Browse Live TV</span>
            </button>
            <button
              onClick={handleAutoDiscover}
              disabled={isDiscovering}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-60"
            >
              <Compass className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`} />
              <span>{isDiscovering ? 'Discovering Channels...' : 'Auto-Discover & Add Channels'}</span>
            </button>
            <button
              onClick={handleToggleAutoAudit}
              disabled={auditToggling}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                isAutoAuditing
                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 shadow-lg shadow-emerald-950/30'
                  : 'bg-nx-surface border border-nx-border text-nx-muted hover:text-white hover:border-amber-500/50'
              }`}
              title="Continuous background stream verification across unverified channels"
            >
              <Zap className={`w-4 h-4 ${isAutoAuditing ? 'text-emerald-400 animate-pulse' : 'text-nx-muted'}`} />
              <span>{isAutoAuditing ? '⚡ Auto-Audit: Active' : 'Start Auto-Audit'}</span>
            </button>
            <button
              onClick={() => onNavigate('satellite')}
              className="px-5 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Radio className="w-4 h-4 text-amber-400" />
              <span>Dish & Satellite</span>
            </button>
            <button
              onClick={onOpenConnectTv}
              className="px-5 py-2.5 rounded-xl bg-nx-surface border border-nx-border hover:border-nx-primary text-white text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Cast className="w-4 h-4 text-nx-primary" />
              <span>Connect to Smart TV</span>
            </button>
            <button
              onClick={() => onNavigate('health')}
              className="px-4 py-2.5 rounded-xl bg-nx-bg border border-nx-border hover:border-white text-nx-muted hover:text-white text-sm font-medium transition-colors"
            >
              Stream Health
            </button>
          </div>

          {discoveryResult && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{discoveryResult}</span>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Audit Live Progress Banner */}
      {isAutoAuditing && (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <div className="text-xs">
              <div className="font-bold text-emerald-300 flex items-center gap-2">
                <span>Auto-Audit Engine Running in Background</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono">
                  25 concurrent checks
                </span>
              </div>
              <p className="text-nx-muted mt-0.5">
                Session verified: <strong className="text-white">{statsSummary?.auto_audit_status?.total_audited_session?.toLocaleString() || 0}</strong> channels &bull;{' '}
                <span className="text-emerald-400">+{statsSummary?.auto_audit_status?.working_found_session?.toLocaleString() || 0} Online</span> &bull;{' '}
                <span className="text-rose-400">+{statsSummary?.auto_audit_status?.offline_found_session?.toLocaleString() || 0} Offline</span> &bull;{' '}
                <span className="text-amber-400">{unverifiedChannels.toLocaleString()} Pending in Queue</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleToggleAutoAudit}
              className="px-3 py-1.5 rounded-xl bg-nx-surface hover:bg-rose-500/20 hover:border-rose-500/40 border border-nx-border text-nx-muted hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause Auto-Audit</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary Metrics: Online, Offline, Discovered & Pending */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-nx-primary" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Stream Health & Catalog Overview</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-nx-muted">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Auto-Sync Active</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Discovered */}
          <button
            onClick={() => onNavigate('livetv', { status: 'ALL' })}
            className="text-left p-4 rounded-2xl bg-nx-surface/70 hover:bg-nx-surface border border-nx-border hover:border-nx-primary/50 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between text-nx-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-nx-primary transition-colors">
                Total Discovered
              </span>
              <Tv className="w-4 h-4 text-nx-primary" />
            </div>
            <p className="text-2xl font-black text-white tracking-tight">
              {totalChannels.toLocaleString()}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-nx-muted">
              <span>All ingested streams</span>
              <span className="text-nx-primary group-hover:translate-x-0.5 transition-transform font-semibold">View &rarr;</span>
            </div>
          </button>

          {/* 2. Verified Online (Working) */}
          <button
            onClick={() => onNavigate('livetv', { status: 'WORKING' })}
            className="text-left p-4 rounded-2xl bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-500/40 hover:border-emerald-400 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Online (Working)</span>
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 tracking-tight">
              {workingChannels.toLocaleString()}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-emerald-400/80">
              <span>Tested & confirmed live</span>
              <span className="font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded text-[10px]">
                {healthRate}% Health
              </span>
            </div>
          </button>

          {/* 3. Offline Feeds */}
          <button
            onClick={() => onNavigate('livetv', { status: 'OFFLINE' })}
            className="text-left p-4 rounded-2xl bg-rose-950/20 hover:bg-rose-950/30 border border-rose-500/40 hover:border-rose-400 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between text-rose-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Offline Feeds</span>
              </span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400 tracking-tight">
              {offlineChannels.toLocaleString()}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-rose-400/80">
              <span>Dead / Inactive feeds</span>
              <span className="font-bold bg-rose-500/20 px-1.5 py-0.5 rounded text-[10px]">
                Filtered out
              </span>
            </div>
          </button>

          {/* 4. Pending / Discovery Queue */}
          <button
            onClick={() => onNavigate('livetv', { status: 'UNVERIFIED' })}
            className="text-left p-4 rounded-2xl bg-amber-950/20 hover:bg-amber-950/30 border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Pending Audit</span>
              </span>
              <Compass className={`w-4 h-4 text-amber-400 ${isAutoAuditing ? 'animate-spin' : ''}`} />
            </div>
            <p className="text-2xl font-black text-amber-300 tracking-tight">
              {unverifiedChannels.toLocaleString()}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-amber-400/80">
              <span>Awaiting auto-check</span>
              <span className="font-bold bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">
                {isAutoAuditing ? 'Auditing...' : 'Queue'}
              </span>
            </div>
          </button>
        </div>

        {/* Visual Stream Health Bar */}
        <div className="p-4 rounded-2xl bg-nx-surface/50 border border-nx-border space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-nx-muted font-medium flex items-center gap-2">
              <Gauge className="w-4 h-4 text-nx-primary" />
              <span>Real-Time Stream Health Distribution</span>
            </span>
            <span className="text-white font-bold">
              {testedCount.toLocaleString()} Verified / {totalChannels.toLocaleString()} Cataloged
            </span>
          </div>

          {/* Progress Segment Bar */}
          <div className="w-full h-3 rounded-full bg-nx-card overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${pctWorking}%` }}
              className="bg-emerald-500 h-full transition-all duration-500"
              title={`Online: ${workingChannels.toLocaleString()} (${pctWorking.toFixed(1)}%)`}
            />
            <div
              style={{ width: `${pctOffline}%` }}
              className="bg-rose-500 h-full transition-all duration-500"
              title={`Offline: ${offlineChannels.toLocaleString()} (${pctOffline.toFixed(1)}%)`}
            />
            <div
              style={{ width: `${pctUnverified}%` }}
              className="bg-amber-500/60 h-full transition-all duration-500"
              title={`Pending: ${unverifiedChannels.toLocaleString()} (${pctUnverified.toFixed(1)}%)`}
            />
          </div>

          {/* Interactive Legend / Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => onNavigate('livetv', { status: 'WORKING' })}
                className="flex items-center gap-1.5 text-emerald-400 hover:underline cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Online: <strong>{workingChannels.toLocaleString()}</strong> ({pctWorking.toFixed(1)}%)</span>
              </button>
              <button
                onClick={() => onNavigate('livetv', { status: 'OFFLINE' })}
                className="flex items-center gap-1.5 text-rose-400 hover:underline cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Offline: <strong>{offlineChannels.toLocaleString()}</strong> ({pctOffline.toFixed(1)}%)</span>
              </button>
              <button
                onClick={() => onNavigate('livetv', { status: 'UNVERIFIED' })}
                className="flex items-center gap-1.5 text-amber-400 hover:underline cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Pending: <strong>{unverifiedChannels.toLocaleString()}</strong> ({pctUnverified.toFixed(1)}%)</span>
              </button>
            </div>
            <button
              onClick={() => onNavigate('health')}
              className="text-nx-primary hover:text-sky-400 flex items-center gap-1 transition-colors font-medium"
            >
              <span>Full Diagnostic Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Secondary Category Metrics: Countries, Satellite, TV Series */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <button
            onClick={() => onNavigate('countries')}
            className="text-left p-4 rounded-2xl bg-nx-surface/70 hover:bg-nx-surface border border-nx-border hover:border-indigo-500/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-nx-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-indigo-400 transition-colors">Countries</span>
              <Globe2 className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-xl font-bold text-white">
              {statsSummary?.total_countries ?? 0}
            </p>
            <span className="text-[11px] text-nx-muted">Worldwide regions</span>
          </button>

          <button
            onClick={() => onNavigate('satellite')}
            className="text-left p-4 rounded-2xl bg-nx-surface/70 hover:bg-nx-surface border border-nx-border hover:border-amber-500/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-nx-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-amber-400 transition-colors">Dish & Satellite</span>
              <Radio className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl font-bold text-white">
              {(statsSummary?.total_satellite ?? 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-nx-muted">DVB-S2 & Free-To-Air transponders</span>
          </button>

          <button
            onClick={() => onNavigate('series')}
            className="text-left p-4 rounded-2xl bg-nx-surface/70 hover:bg-nx-surface border border-nx-border hover:border-nx-accent/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-nx-muted mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-nx-accent transition-colors">TV Series Channels</span>
              <Film className="w-4 h-4 text-nx-accent" />
            </div>
            <p className="text-xl font-bold text-white">
              {(statsSummary?.total_series ?? 0).toLocaleString()}
            </p>
            <span className="text-[11px] text-nx-muted">24/7 drama & sitcom streams</span>
          </button>
        </div>
      </div>

      {/* Dish & Satellite Spotlight Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-nx-surface to-nx-card border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 text-amber-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Dish & Digital Satellite Networks</h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                DVB-S2 & FTA
              </span>
            </div>
            <p className="text-xs text-nx-muted mt-0.5">
              Browse channels from your sources that are tagged as free-to-air satellite feeds, grouped by network.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('satellite')}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-colors flex-shrink-0 shadow-lg shadow-amber-500/20"
        >
          <span>Explore Satellite TV</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Featured Working Channels */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Verified Live Channels</span>
            </h2>
            <p className="text-xs text-nx-muted">Streams tested and confirmed active by the testing engine</p>
          </div>
          <button
            onClick={() => onNavigate('livetv', { status: 'WORKING' })}
            className="text-xs font-semibold text-nx-primary hover:text-sky-400 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredChannels.map(channel => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onSelect={onSelectChannel}
            />
          ))}
        </div>
      </section>

      {/* Continue Watching / Recent Channels */}
      {recentChannels.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-nx-primary" />
              <span>Continue Watching</span>
            </h2>
            <button
              onClick={async () => {
                await clearHistory();
                setRecentChannels([]);
              }}
              className="px-3 py-1 rounded-xl bg-nx-surface hover:bg-rose-600/80 hover:text-white border border-nx-border text-nx-muted text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Clear recently watched history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentChannels.map(channel => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onSelect={onSelectChannel}
              />
            ))}
          </div>
        </section>
      )}

      {/* Browse By Country Shortcuts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Browse By Country</h2>
            <p className="text-xs text-nx-muted">Instant country selection with ISO flags</p>
          </div>
          <button
            onClick={() => onNavigate('countries')}
            className="text-xs font-semibold text-nx-primary hover:text-sky-400 flex items-center gap-1 transition-colors"
          >
            <span>All Countries</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {countries.map(c => (
            <button
              key={c.country_code}
              onClick={() => onNavigate('livetv', { country: c.country_code, status: 'WORKING' })}
              className="p-3 rounded-2xl bg-nx-surface/80 hover:bg-nx-card border border-nx-border hover:border-nx-primary/60 text-center transition-all group flex flex-col items-center"
            >
              <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{c.country_flag}</span>
              <span className="text-xs font-semibold text-white truncate w-full">{c.country}</span>
              <span className="text-[10px] text-nx-muted">{c.total} channels</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
