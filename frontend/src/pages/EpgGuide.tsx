import React, { useEffect, useState } from 'react';
import { Channel } from '../types';
import { fetchChannels } from '../services/api';
import { Calendar, Upload, RefreshCw, Clock, Tv } from 'lucide-react';

interface EpgGuideProps {
  onSelectChannel: (channel: Channel) => void;
}

export const EpgGuide: React.FC<EpgGuideProps> = ({ onSelectChannel }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [epgUrl, setEpgUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchChannels({ page_size: 30 })
      .then(res => { if (active) setChannels(res.items); })
      .catch((err: unknown) => { if (active) setStatusMsg(`Could not load channels: ${err instanceof Error ? err.message : String(err)}`); });
    return () => { active = false; };
  }, []);

  const handleImportUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!epgUrl) return;
    setImporting(true);
    setStatusMsg('Importing XMLTV EPG data in background...');
    try {
      const res = await fetch(`/api/epg/import-url?url=${encodeURIComponent(epgUrl)}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatusMsg(`Successfully imported ${data.programs_imported} program schedules!`);
        setEpgUrl('');
      } else {
        setStatusMsg(`Import failed: ${data.detail}`);
      }
    } catch (err: unknown) {
      setStatusMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImporting(false);
    }
  };

  const handleUploadXmltv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setStatusMsg('Parsing XMLTV schedule...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/epg/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatusMsg(`Successfully imported ${data.programs_imported} program schedules from ${file.name}!`);
      } else {
        setStatusMsg(`Import failed: ${data.detail}`);
      }
    } catch (err: unknown) {
      setStatusMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-nx-accent" />
            <span>Electronic Program Guide (EPG)</span>
          </h1>
          <p className="text-xs text-nx-muted">
            Live TV timeline, schedule guide, and XMLTV program listings
          </p>
        </div>

        {/* Upload XMLTV File */}
        <label className="px-3.5 py-1.5 rounded-xl bg-nx-surface hover:bg-nx-card border border-nx-border hover:border-nx-accent text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors">
          <Upload className="w-4 h-4 text-nx-accent" />
          <span>Upload XMLTV File</span>
          <input
            type="file"
            accept=".xml,.xmltv,.gz"
            onChange={handleUploadXmltv}
            disabled={importing}
            className="hidden"
          />
        </label>
      </div>

      {/* XMLTV URL Import Bar */}
      <form onSubmit={handleImportUrl} className="p-4 rounded-2xl bg-nx-surface border border-nx-border flex flex-wrap items-center gap-3">
        <Clock className="w-4 h-4 text-nx-primary" />
        <span className="text-xs font-semibold text-white">Import Remote XMLTV URL:</span>
        <input
          type="url"
          value={epgUrl}
          onChange={e => setEpgUrl(e.target.value)}
          placeholder="https://iptv-org.github.io/epg/guides/..."
          className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl bg-nx-bg border border-nx-border text-xs text-white placeholder-nx-muted focus:outline-none focus:border-nx-primary font-mono"
        />
        <button
          type="submit"
          disabled={importing || !epgUrl}
          className="px-4 py-1.5 rounded-xl bg-nx-primary hover:bg-nx-primary-hover text-white text-xs font-bold transition-all disabled:opacity-50"
        >
          {importing ? 'Importing...' : 'Fetch EPG'}
        </button>
      </form>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-nx-card border border-nx-primary/40 text-xs text-white">
          {statusMsg}
        </div>
      )}

      {/* EPG Timeline Grid */}
      <div className="rounded-2xl border border-nx-border bg-nx-surface overflow-hidden">
        <div className="p-4 border-b border-nx-border/80 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Tv className="w-4 h-4 text-nx-primary" />
            <span>Channel Program Schedules</span>
          </h3>
          <span className="text-xs text-nx-muted">Now Playing</span>
        </div>

        <div className="divide-y divide-nx-border/60">
          {channels.map(channel => (
            <div
              key={channel.id}
              onClick={() => onSelectChannel(channel)}
              className="p-4 hover:bg-nx-card/40 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-[220px]">
                <span className="text-xl">{channel.country_flag}</span>
                <div>
                  <h4 className="text-sm font-semibold text-white hover:text-nx-primary transition-colors">
                    {channel.name}
                  </h4>
                  <span className="text-[11px] text-nx-muted">{channel.category}</span>
                </div>
              </div>

              {/* Schedule Timeline Slot */}
              <div className="flex-1 flex items-center gap-3 overflow-x-auto">
                <div className="flex-1 p-2.5 rounded-xl bg-nx-bg border border-nx-border text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Live Broadcast</span>
                    </span>
                    <span className="text-[11px] text-nx-muted">Continuous 24/7</span>
                  </div>
                  <p className="text-white text-xs font-medium truncate">
                    {channel.description || `${channel.name} — Regular programming schedule`}
                  </p>
                </div>

                <div className="w-48 p-2.5 rounded-xl bg-nx-bg/60 border border-nx-border/40 text-xs hidden lg:block">
                  <span className="text-[10px] text-nx-muted uppercase block mb-1">Next Up</span>
                  <p className="text-nx-muted text-xs truncate">Scheduled broadcast</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
