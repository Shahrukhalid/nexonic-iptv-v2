import React, { useEffect, useState } from 'react';
import { Tv, Copy, Check, X, Wifi, MonitorPlay, ExternalLink, HelpCircle } from 'lucide-react';
import { fetchConnectInfo } from '../services/api';
import { ConnectInfo } from '../types';

interface ConnectTvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectTvModal: React.FC<ConnectTvModalProps> = ({ isOpen, onClose }) => {
  const [info, setInfo] = useState<ConnectInfo | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConnectInfo().then(setInfo).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-nx-surface border border-nx-border rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-nx-muted hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-nx-primary/20 border border-nx-primary/40 flex items-center justify-center text-nx-primary">
            <Tv className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Connect Smart TV</h3>
            <p className="text-xs text-nx-muted">
              Stream Nexonic IPTV v2 directly on your Smart TV via Xtream Codes API or M3U Plus URL
            </p>
          </div>
        </div>

        {/* Credentials Grid */}
        {info ? (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Server URL */}
              <div className="p-3 rounded-xl bg-nx-bg border border-nx-border">
                <span className="text-[11px] font-semibold text-nx-muted uppercase tracking-wider block mb-1">
                  Server URL (With Port)
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono text-white select-all truncate">{info.server_url}</span>
                  <button
                    onClick={() => copyToClipboard(info.server_url, 'url')}
                    className="p-1.5 rounded-lg bg-nx-surface hover:bg-nx-border text-nx-muted hover:text-white transition-colors flex-shrink-0"
                    title="Copy URL"
                  >
                    {copiedField === 'url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Server Port */}
              <div className="p-3 rounded-xl bg-nx-bg border border-nx-border">
                <span className="text-[11px] font-semibold text-nx-muted uppercase tracking-wider block mb-1">
                  Server Port
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono text-white select-all">{info.port}</span>
                  <button
                    onClick={() => copyToClipboard(String(info.port), 'port')}
                    className="p-1.5 rounded-lg bg-nx-surface hover:bg-nx-border text-nx-muted hover:text-white transition-colors flex-shrink-0"
                    title="Copy Port"
                  >
                    {copiedField === 'port' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Username */}
              <div className="p-3 rounded-xl bg-nx-bg border border-nx-border">
                <span className="text-[11px] font-semibold text-nx-muted uppercase tracking-wider block mb-1">
                  Username
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono text-white select-all">{info.xtream_username}</span>
                  <button
                    onClick={() => copyToClipboard(info.xtream_username, 'user')}
                    className="p-1.5 rounded-lg bg-nx-surface hover:bg-nx-border text-nx-muted hover:text-white transition-colors flex-shrink-0"
                    title="Copy Username"
                  >
                    {copiedField === 'user' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="p-3 rounded-xl bg-nx-bg border border-nx-border">
                <span className="text-[11px] font-semibold text-nx-muted uppercase tracking-wider block mb-1">
                  Password
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono text-white select-all">{info.xtream_password}</span>
                  <button
                    onClick={() => copyToClipboard(info.xtream_password, 'pass')}
                    className="p-1.5 rounded-lg bg-nx-surface hover:bg-nx-border text-nx-muted hover:text-white transition-colors flex-shrink-0"
                    title="Copy Password"
                  >
                    {copiedField === 'pass' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* M3U Playlist URL */}
            <div className="p-3 rounded-xl bg-nx-bg border border-nx-border">
              <span className="text-[11px] font-semibold text-nx-muted uppercase tracking-wider block mb-1">
                Full M3U Playlist URL (Alternative for Smart IPTV / Nanomid)
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-white truncate select-all">{info.m3u_url}</span>
                <button
                  onClick={() => copyToClipboard(info.m3u_url, 'm3u')}
                  className="p-1.5 rounded-lg bg-nx-surface hover:bg-nx-border text-nx-muted hover:text-white transition-colors flex-shrink-0"
                  title="Copy M3U URL"
                >
                  {copiedField === 'm3u' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-4 rounded-xl bg-nx-card border border-nx-border space-y-2 text-xs text-white/90">
              <div className="flex items-center gap-2 font-bold text-white mb-1">
                <MonitorPlay className="w-4 h-4 text-nx-primary" />
                <span>How to setup on LG webOS Smart TV:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-nx-muted leading-relaxed pl-1">
                <li>Make sure your Smart TV is connected to the same Wi-Fi / Local Network as this computer.</li>
                <li>On your Smart TV, install <strong className="text-white">IPTV Smarters Pro</strong>, <strong className="text-white">IBO Player</strong>, <strong className="text-white">Bay TV</strong>, or <strong className="text-white">Nanomid</strong> from your TV's app store.</li>
                <li>Select <strong className="text-white">"Add User"</strong> and choose <strong className="text-white">"Login with Xtream Codes API"</strong>.</li>
                <li>Enter Playlist Name: <strong className="text-white">Nexonic IPTV v2</strong></li>
                <li>Enter Server URL: <strong className="text-white font-mono">{info.server_url}</strong></li>
                <li>Enter Username: <strong className="text-white font-mono">{info.xtream_username}</strong> and Password: <strong className="text-white font-mono">{info.xtream_password}</strong></li>
                <li>Click <strong className="text-white">Add User / Login</strong> to load live channels, categories, and TV series on your TV!</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-nx-muted">Loading local connection info...</div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-nx-primary hover:bg-nx-primary-hover text-white text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
