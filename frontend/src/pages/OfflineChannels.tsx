import React, { useEffect, useState } from 'react';
import { Channel, CategoryStat } from '../types';
import { fetchChannels, scanOfflineMedia, fetchOfflineFiles, fetchCategoryStats } from '../services/api';
import { ChannelCard } from '../components/ChannelCard';
import { Player } from '../components/Player';
import { HardDrive, RefreshCw, Folder, Tv, Video, Sparkles, Film, Radio, Filter } from 'lucide-react';

interface OfflineChannelsProps {
  onSelectChannel: (channel: Channel) => void;
  activeChannel: Channel | null;
}

export const OfflineChannels: React.FC<OfflineChannelsProps> = ({
  onSelectChannel,
  activeChannel }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [offlineDir, setOfflineDir] = useState<string>('local-data/offline_media');
  const [localFileCount, setLocalFileCount] = useState<number>(0);

  // Load offline files info
  useEffect(() => {
    fetchOfflineFiles()
      .then(res => {
        setOfflineDir(res.directory);
        setLocalFileCount(res.count);
      })
      .catch(() => {});
  }, []);

  const [categories, setCategories] = useState<{ id: string; label: string; count?: number }[]>([
    { id: 'ALL', label: 'All Offline & VOD' }
  ]);

  // Load dynamic VOD categories from backend with live auto-sync
  useEffect(() => {
    const refreshVodCats = () => {
      fetchCategoryStats(true)
        .then((stats: CategoryStat[]) => {
          const dynamicCats = stats
            .filter(s => s.count > 0)
            .sort((a, b) => a.category.localeCompare(b.category))
            .map(s => ({
              id: s.category,
              label: s.category,
              count: s.count
            }));
          setCategories([{ id: 'ALL', label: 'All Offline & VOD' }, ...dynamicCats]);
        })
        .catch(() => {});
    };
    refreshVodCats();
    const interval = setInterval(refreshVodCats, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadOfflineChannels = async () => {
    setLoading(true);
    try {
      const res = await fetchChannels({
        is_vod: true,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        sort_by: 'working_first',
        page_size: 100
      });
      setChannels(res.items);
      if (!activeChannel && res.items.length > 0) {
        onSelectChannel(res.items[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfflineChannels();
  }, [selectedCategory]);

  const handleScanDirectory = async () => {
    setScanning(true);
    try {
      const res = await scanOfflineMedia();
      alert(`Scanned local media! Registered ${res.new_files_registered} new local video file(s).`);
      await loadOfflineChannels();
    } catch (e) {
      alert('Error scanning local folder: ' + e);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-nx-surface to-nx-card border border-emerald-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <HardDrive className="w-3.5 h-3.5" />
            <span>100% Local Offline Media & VOD</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Offline Channels & Local Media</h1>
          <p className="text-xs text-nx-muted max-w-lg mt-1">
            Playable offline channels, SMPTE broadcast standby test patterns, local video files, and on-demand open cinema. Requires zero internet access.
          </p>
        </div>

        <button
          onClick={handleScanDirectory}
          disabled={scanning}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-lg disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Scanning Folder...' : 'Rescan Local Media Folder'}</span>
        </button>
      </div>

      {/* Directory Notice */}
      <div className="p-4 rounded-2xl bg-nx-surface/80 border border-nx-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-nx-muted">
          <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Local Offline Directory: <code className="text-emerald-300 bg-black/40 px-2 py-0.5 rounded font-mono select-all">{offlineDir}</code>
          </span>
        </div>
        <div className="text-nx-muted text-[11px]">
          Drop any <span className="text-white font-mono">.mp4</span>, <span className="text-white font-mono">.mkv</span>, or <span className="text-white font-mono">.ts</span> video here to play offline! ({localFileCount} local files)
        </div>
      </div>

      {/* Category Dropdown Filter Bar */}
      <div className="p-4 rounded-2xl bg-nx-surface/80 border border-nx-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span>Offline & VOD Category:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-nx-bg border border-nx-border hover:border-emerald-500 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer min-w-[280px] sm:min-w-[340px]"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                📁 {cat.label} {cat.count !== undefined ? `(${cat.count} files/channels)` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-nx-muted flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
            {categories.length} categories available
          </span>
        </div>
      </div>

      {/* Active Offline Player */}
      {activeChannel && (
        <div className="w-full max-w-5xl mx-auto shadow-2xl rounded-2xl overflow-hidden border border-emerald-900/40">
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

      {/* Offline Channels Grid */}
      {loading ? (
        <div className="py-20 text-center text-nx-muted">Loading offline channels...</div>
      ) : channels.length === 0 ? (
        <div className="py-16 text-center text-nx-muted bg-nx-surface rounded-2xl border border-nx-border p-6">
          <Tv className="w-12 h-12 text-nx-muted mx-auto mb-3 opacity-40" />
          <h4 className="text-base font-bold text-white mb-1">No offline channels found in this category</h4>
          <p className="text-xs max-w-sm mx-auto mb-4">
            Select "All Offline & VOD" or drop your local video files into the local offline media folder.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
};
