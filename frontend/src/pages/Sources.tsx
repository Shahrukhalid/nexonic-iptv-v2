import React, { useEffect, useState } from 'react';
import { Source } from '../types';
import { fetchSources, refreshSource, deleteSource, addSource, uploadPlaylist, autoDiscoverChannels } from '../services/api';
import {
  Layers,
  RefreshCw,
  Plus,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Compass
} from 'lucide-react';

interface SourcesProps {
}

export const Sources: React.FC<SourcesProps> = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [isAutoDiscovering, setIsAutoDiscovering] = useState(false);

  // Add source form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addMsg, setAddMsg] = useState<string | null>(null);

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadSources = async () => {
    try {
      const data = await fetchSources();
      setSources(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
    const interval = setInterval(loadSources, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAutoDiscoverAll = async () => {
    setIsAutoDiscovering(true);
    try {
      const res = await autoDiscoverChannels();
      await loadSources();
      alert(`Auto-discovery completed! Discovered ${res.new_channels_added} new channels (${res.total_channels} total in database).`);
    } catch (e: any) {
      alert(`Auto-discovery error: ${e.message}`);
    } finally {
      setIsAutoDiscovering(false);
    }
  };

  const handleRefresh = async (sourceId: number) => {
    setRefreshingId(sourceId);
    try {
      await refreshSource(sourceId);
      await loadSources();
    } catch (err: any) {
      alert(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDelete = async (sourceId: number) => {
    if (confirm('Are you sure you want to delete this source and its imported channels?')) {
      await deleteSource(sourceId);
      await loadSources();
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUrl) return;
    try {
      setAddMsg('Adding and importing channels in background...');
      await addSource(newName, newUrl);
      setShowAddModal(false);
      setNewName('');
      setNewUrl('');
      setAddMsg(null);
      await loadSources();
    } catch (err: any) {
      setAddMsg(`Error: ${err.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadPlaylist(file, file.name);
      await loadSources();
      alert(`Playlist '${file.name}' imported successfully!`);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-nx-primary" />
            <span>IPTV Source Manager & Playlists</span>
          </h1>
          <p className="text-xs text-nx-muted">
            Manage remote IPTV directory URLs and upload local M3U / M3U8 playlist files
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-Discover All Sources */}
          <button
            onClick={handleAutoDiscoverAll}
            disabled={isAutoDiscovering}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
          >
            <Compass className={`w-4 h-4 ${isAutoDiscovering ? 'animate-spin' : ''}`} />
            <span>{isAutoDiscovering ? 'Discovering...' : 'Auto-Discover All'}</span>
          </button>

          {/* Upload Local File Button */}
          <label className="px-3.5 py-2 rounded-xl bg-nx-surface hover:bg-nx-card border border-nx-border hover:border-nx-primary text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-nx-primary" />
            <span>{uploading ? 'Importing...' : 'Upload Local M3U'}</span>
            <input
              type="file"
              accept=".m3u,.m3u8,.txt"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {/* Add Remote Source URL */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-nx-primary hover:bg-nx-primary-hover text-white text-xs font-bold flex items-center gap-2 shadow-glow-blue transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Source URL</span>
          </button>
        </div>
      </div>

      {/* Sources List Table */}
      <div className="rounded-2xl border border-nx-border bg-nx-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-nx-bg border-b border-nx-border text-nx-muted uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Source Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Discovered</th>
                <th className="py-3 px-4">Active Verified</th>
                <th className="py-3 px-4">Last Status</th>
                <th className="py-3 px-4">Last Refresh</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nx-border/60">
              {sources.map(src => (
                <tr key={src.id} className="hover:bg-nx-card/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-nx-primary flex-shrink-0" />
                      <div>
                        <strong className="text-white text-sm block">{src.name}</strong>
                        <span className="text-[11px] text-nx-muted font-mono truncate max-w-xs block">
                          {src.url}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono uppercase text-nx-muted">{src.type}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-nx-bg border border-nx-border text-white font-semibold">
                      {src.channel_count}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                      {src.working_count || 0}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {src.last_status === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Success</span>
                      </span>
                    ) : src.last_status ? (
                      <span className="text-rose-400 truncate max-w-xs block" title={src.last_status}>
                        {src.last_status}
                      </span>
                    ) : (
                      <span className="text-nx-muted">Pending</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-nx-muted">
                    {src.last_refreshed_at ? new Date(src.last_refreshed_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRefresh(src.id)}
                        disabled={refreshingId === src.id}
                        className="p-1.5 rounded-lg bg-nx-bg hover:bg-nx-primary hover:text-white text-nx-muted border border-nx-border transition-colors disabled:opacity-50"
                        title="Refresh and import channels from this source"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === src.id ? 'animate-spin text-white' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(src.id)}
                        className="p-1.5 rounded-lg bg-nx-bg hover:bg-rose-600 hover:text-white text-nx-muted border border-nx-border transition-colors"
                        title="Delete source"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-nx-surface border border-nx-border rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">Add Remote IPTV Source</h3>
            <p className="text-xs text-nx-muted mb-4">
              Enter any publicly accessible M3U / M3U8 directory URL to import its live channels.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-nx-muted mb-1">Source Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g., My Favorite Sports Channels"
                  className="w-full px-3 py-2 rounded-xl bg-nx-bg border border-nx-border text-xs text-white focus:outline-none focus:border-nx-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-nx-muted mb-1">M3U / M3U8 Stream URL</label>
                <input
                  type="url"
                  required
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://example.com/playlist.m3u"
                  className="w-full px-3 py-2 rounded-xl bg-nx-bg border border-nx-border text-xs text-white focus:outline-none focus:border-nx-primary font-mono"
                />
              </div>

              {addMsg && <p className="text-xs text-amber-400">{addMsg}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-nx-bg border border-nx-border text-xs text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-nx-primary hover:bg-nx-primary-hover text-xs font-bold text-white shadow-glow-blue"
                >
                  Save & Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
