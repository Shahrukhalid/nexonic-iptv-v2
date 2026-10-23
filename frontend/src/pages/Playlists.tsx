import React, { useEffect, useState } from 'react';
import { Playlist } from '../types';
import { fetchPlaylists, createPlaylist } from '../services/api';
import { Download, Plus, Film, Radio, FileText, Check } from 'lucide-react';

interface PlaylistsProps {
}

export const Playlists: React.FC<PlaylistsProps> = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(true);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const data = await fetchPlaylists();
      setPlaylists(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    await createPlaylist(name, desc, []);
    setName('');
    setDesc('');
    setShowCreateModal(false);
    await loadPlaylists();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-nx-primary" />
            <span>Playlist Manager & M3U Export</span>
          </h1>
          <p className="text-xs text-nx-muted">
            Create custom channel collections and export standard M3U/M3U8 files for any IPTV player
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-nx-primary hover:bg-nx-primary-hover text-white text-xs font-bold flex items-center gap-2 shadow-glow-blue transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Quick Preset Exports Card */}
      <div className="p-6 rounded-2xl bg-nx-surface border border-nx-border space-y-4">
        <h3 className="text-base font-bold text-white">Instant Filtered M3U Downloads</h3>
        <p className="text-xs text-nx-muted">
          Download clean, verified M3U files generated directly from your local Nexonic IPTV v2 database:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <a
            href={`/api/playlists/export/filtered.m3u?status=WORKING`}
            download="nexonic_iptv_working.m3u"
            className="p-3.5 rounded-xl bg-nx-bg border border-nx-border hover:border-emerald-400 text-white flex items-center justify-between group transition-all"
          >
            <div>
              <strong className="text-xs text-emerald-400 block mb-0.5">Verified Working Channels</strong>
              <span className="text-[10px] text-nx-muted">Active tested streams</span>
            </div>
            <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </a>

          <a
            href={`/api/playlists/export/filtered.m3u?category=News`}
            download="nexonic_iptv_news.m3u"
            className="p-3.5 rounded-xl bg-nx-bg border border-nx-border hover:border-sky-400 text-white flex items-center justify-between group transition-all"
          >
            <div>
              <strong className="text-xs text-sky-400 block mb-0.5">News Channels</strong>
              <span className="text-[10px] text-nx-muted">Global news networks</span>
            </div>
            <Download className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          </a>

          <a
            href={`/api/playlists/export/filtered.m3u?category=Sports`}
            download="nexonic_iptv_sports.m3u"
            className="p-3.5 rounded-xl bg-nx-bg border border-nx-border hover:border-amber-400 text-white flex items-center justify-between group transition-all"
          >
            <div>
              <strong className="text-xs text-amber-400 block mb-0.5">Sports Channels</strong>
              <span className="text-[10px] text-nx-muted">Worldwide sports streams</span>
            </div>
            <Download className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </a>

          <a
            href={`/api/playlists/export/filtered.m3u?is_series=true`}
            download="nexonic_iptv_series.m3u"
            className="p-3.5 rounded-xl bg-nx-bg border border-nx-border hover:border-purple-400 text-white flex items-center justify-between group transition-all"
          >
            <div>
              <strong className="text-xs text-purple-400 block mb-0.5">TV Series 24/7</strong>
              <span className="text-[10px] text-nx-muted">Sitcoms & drama marathons</span>
            </div>
            <Download className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </a>
        </div>
      </div>

      {/* User Custom Playlists */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white">Custom Playlists</h3>
        {playlists.length === 0 ? (
          <div className="p-8 rounded-2xl bg-nx-surface border border-nx-border text-center text-xs text-nx-muted">
            No custom playlists created yet. Click "New Playlist" to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map(pl => (
              <div key={pl.id} className="p-4 rounded-2xl bg-nx-surface border border-nx-border flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{pl.name}</h4>
                  <p className="text-xs text-nx-muted">{pl.description || 'Custom playlist collection'}</p>
                </div>
                <a
                  href={`/api/playlists/${pl.id}/export.m3u`}
                  download
                  className="p-2 rounded-xl bg-nx-bg border border-nx-border hover:border-nx-primary text-nx-primary"
                  title="Export M3U"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-nx-surface border border-nx-border rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">Create Custom Playlist</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-nx-muted mb-1">Playlist Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Nexonic IPTV v2 - My Favorite Channels"
                  className="w-full px-3 py-2 rounded-xl bg-nx-bg border border-nx-border text-xs text-white focus:outline-none focus:border-nx-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-nx-muted mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Personal curated channel list"
                  className="w-full px-3 py-2 rounded-xl bg-nx-bg border border-nx-border text-xs text-white focus:outline-none focus:border-nx-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-nx-bg border border-nx-border text-xs text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-nx-primary hover:bg-nx-primary-hover text-xs font-bold text-white"
                >
                  Create Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
