import React, { useEffect, useState } from 'react';
import { Tv, Copy, Check, Cast, MonitorPlay, Wifi, ShieldCheck } from 'lucide-react';
import { fetchConnectInfo } from '../services/api';
import { ConnectInfo } from '../types';

export const ConnectTv: React.FC = () => {
  const [info, setInfo] = useState<ConnectInfo | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    fetchConnectInfo().then(setInfo).catch(() => setBlocked(true));
  }, []);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Cast className="w-6 h-6 text-nx-primary animate-pulse" />
          <span>Connect Smart TV (Xtream Codes API)</span>
        </h1>
        <p className="text-xs text-nx-muted">
          This computer hosts this local IPTV & Xtream Codes server. Connect your Smart TV via Wi-Fi or Ethernet.
        </p>
      </div>

      {info ? (
        <div className="space-y-6">
          {!info.shared_on_network && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
              The server is only reachable from this computer. To connect a TV on your home network, set
              <code className="mx-1 px-1.5 py-0.5 rounded bg-nx-bg text-white">NEXONIC_HOST=0.0.0.0</code>
              in your <code className="px-1.5 py-0.5 rounded bg-nx-bg text-white">.env</code> file and restart. Don't expose it to the internet.
            </div>
          )}
          {/* Main Credentials Display */}
          <div className="p-6 rounded-3xl bg-nx-surface border border-nx-border space-y-4 shadow-xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Xtream Codes Server Parameters</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-nx-bg border border-nx-border">
                <span className="text-xs font-semibold text-nx-muted uppercase tracking-wider block mb-1">
                  Server URL (With Port)
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm md:text-base font-mono text-white font-bold select-all truncate">
                    {info.server_url}
                  </span>
                  <button
                    onClick={() => copyToClipboard(info.server_url, 'url')}
                    className="p-2 rounded-xl bg-nx-surface hover:bg-nx-border text-nx-muted hover:text-white transition-colors"
                    title="Copy URL"
                  >
                    {copiedField === 'url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-nx-bg border border-nx-border">
                <span className="text-xs font-semibold text-nx-muted uppercase tracking-wider block mb-1">
                  Port
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm md:text-base font-mono text-white font-bold select-all">
                    {info.port}
                  </span>
                  <button
                    onClick={() => copyToClipboard(String(info.port), 'port')}
                    className="p-2 rounded-xl bg-nx-surface hover:bg-nx-border text-nx-muted hover:text-white transition-colors"
                    title="Copy Port"
                  >
                    {copiedField === 'port' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-nx-bg border border-nx-border">
                <span className="text-xs font-semibold text-nx-muted uppercase tracking-wider block mb-1">
                  Username
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm md:text-base font-mono text-white font-bold select-all">
                    {info.xtream_username}
                  </span>
                  <button
                    onClick={() => copyToClipboard(info.xtream_username, 'user')}
                    className="p-2 rounded-xl bg-nx-surface hover:bg-nx-border text-nx-muted hover:text-white transition-colors"
                    title="Copy Username"
                  >
                    {copiedField === 'user' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-nx-bg border border-nx-border">
                <span className="text-xs font-semibold text-nx-muted uppercase tracking-wider block mb-1">
                  Password
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm md:text-base font-mono text-white font-bold select-all">
                    {info.xtream_password}
                  </span>
                  <button
                    onClick={() => copyToClipboard(info.xtream_password, 'pass')}
                    className="p-2 rounded-xl bg-nx-surface hover:bg-nx-border text-nx-muted hover:text-white transition-colors"
                    title="Copy Password"
                  >
                    {copiedField === 'pass' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* M3U Link */}
            <div className="p-4 rounded-2xl bg-nx-bg border border-nx-border">
              <span className="text-xs font-semibold text-nx-muted uppercase tracking-wider block mb-1">
                Direct M3U Plus URL (Alternative for Nanomid or Smart IPTV)
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-white select-all truncate">{info.m3u_url}</span>
                <button
                  onClick={() => copyToClipboard(info.m3u_url, 'm3u')}
                  className="p-2 rounded-xl bg-nx-surface hover:bg-nx-border text-nx-muted hover:text-white transition-colors"
                >
                  {copiedField === 'm3u' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Step-by-Step Setup Guide */}
          <div className="p-6 rounded-3xl bg-nx-card border border-nx-border space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MonitorPlay className="w-5 h-5 text-nx-primary" />
              <span>Step-by-Step Smart TV Setup Guide</span>
            </h2>

            <div className="space-y-3 text-sm text-nx-muted leading-relaxed">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-nx-surface/60 border border-nx-border/50">
                <div className="w-6 h-6 rounded-full bg-nx-primary/20 text-nx-primary font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  1
                </div>
                <div>
                  <strong className="text-white block mb-0.5">Connect to Same Wi-Fi</strong>
                  Ensure your Smart TV is on the same local network or Wi-Fi as your computer.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-nx-surface/60 border border-nx-border/50">
                <div className="w-6 h-6 rounded-full bg-nx-primary/20 text-nx-primary font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  2
                </div>
                <div>
                  <strong className="text-white block mb-0.5">Install an IPTV App on LG Content Store</strong>
                  Open the LG Content Store / Apps on your TV and install any of the following popular apps:
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs text-white">
                    <li><strong>IPTV Smarters Pro</strong> (Recommended)</li>
                    <li><strong>IBO Player</strong></li>
                    <li><strong>Bay TV</strong></li>
                    <li><strong>Nanomid Player</strong></li>
                    <li><strong>Smart IPTV</strong></li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-nx-surface/60 border border-nx-border/50">
                <div className="w-6 h-6 rounded-full bg-nx-primary/20 text-nx-primary font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  3
                </div>
                <div>
                  <strong className="text-white block mb-0.5">Choose "Login with Xtream Codes API"</strong>
                  In the app on your TV, choose "Add User" and select <strong>Login with Xtream Codes API</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-nx-surface/60 border border-nx-border/50">
                <div className="w-6 h-6 rounded-full bg-nx-primary/20 text-nx-primary font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  4
                </div>
                <div>
                  <strong className="text-white block mb-0.5">Enter the Credentials Above</strong>
                  Type in the Server URL (<strong className="text-white font-mono">{info.server_url}</strong>), Username (<strong className="text-white font-mono">{info.xtream_username}</strong>), and Password (<strong className="text-white font-mono">{info.xtream_password}</strong>).
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-nx-surface/60 border border-nx-border/50">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  5
                </div>
                <div>
                  <strong className="text-white block mb-0.5">Enjoy Nexonic IPTV v2 on the Big Screen!</strong>
                  Your categories, live worldwide television channels, EPG program guide, and TV series will instantly load directly on your Smart TV!
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-nx-muted">
          {blocked
            ? 'For your security, TV login details are only shown on the computer running Nexonic IPTV v2.'
            : 'Loading local connection info...'}
        </div>
      )}
    </div>
  );
};
