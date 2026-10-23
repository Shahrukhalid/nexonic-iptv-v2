import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Tv, HardDrive, Save, Check, Trash2, Activity } from 'lucide-react';
import { fetchSettings, fetchConnectInfo, updateXtreamCredentials, clearHistory, fetchAutoCheckConfig, setAutoCheckInterval } from '../services/api';
import { AppSettings } from '../types';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Xtream credentials
  const [xtreamUser, setXtreamUser] = useState('');
  const [xtreamPass, setXtreamPass] = useState('');
  const [savedXtream, setSavedXtream] = useState(false);

  // Auto-Check & History
  const [autoCheckSecs, setAutoCheckSecs] = useState<number>(30);
  const [clearedHistoryMsg, setClearedHistoryMsg] = useState(false);
  const [savedAutoCheck, setSavedAutoCheck] = useState(false);

  useEffect(() => {
    fetchSettings().then(setSettings).catch(() => {});
    // Credentials are only returned to the computer running the server.
    fetchConnectInfo()
      .then(info => {
        setXtreamUser(info.xtream_username);
        setXtreamPass(info.xtream_password);
      })
      .catch(() => {});
    fetchAutoCheckConfig().then(cfg => {
      setAutoCheckSecs(cfg.interval_seconds);
    }).catch(() => {});
  }, []);

  const handleClearHistory = async () => {
    if (confirm("Are you sure you want to clear your local watch history?")) {
      await clearHistory();
      setClearedHistoryMsg(true);
      setTimeout(() => setClearedHistoryMsg(false), 3000);
    }
  };

  const handleUpdateAutoCheck = async (secs: number) => {
    setAutoCheckSecs(secs);
    await setAutoCheckInterval(secs);
    setSavedAutoCheck(true);
    setTimeout(() => setSavedAutoCheck(false), 2500);
  };

  const handleSaveXtream = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateXtreamCredentials(xtreamUser, xtreamPass);
      setSavedXtream(true);
      setTimeout(() => setSavedXtream(false), 2500);
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  };


  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-nx-primary" />
          <span>Application Settings</span>
        </h1>
        <p className="text-xs text-nx-muted">
          Configure playback, Smart TV access and history
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Xtream Codes / TV Credentials Form */}
        <div className="p-6 rounded-3xl bg-nx-surface border border-nx-border space-y-4">
          <div className="flex items-center gap-2 text-white font-bold">
            <Tv className="w-5 h-5 text-nx-primary" />
            <span>Smart TV (Xtream Codes) login</span>
          </div>
          <p className="text-xs text-nx-muted">
            Customize the username and password used by your Smart TV to authenticate with Nexonic IPTV v2.
          </p>

          <form onSubmit={handleSaveXtream} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-nx-muted mb-1">Xtream Username</label>
              <input
                type="text"
                required
                value={xtreamUser}
                onChange={e => setXtreamUser(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-nx-bg border border-nx-border text-xs text-white focus:outline-none focus:border-nx-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-nx-muted mb-1">Xtream Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={xtreamPass}
                onChange={e => setXtreamPass(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-nx-bg border border-nx-border text-xs text-white focus:outline-none focus:border-nx-primary font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-nx-primary hover:bg-nx-primary-hover text-white text-xs font-bold flex items-center justify-center gap-2 shadow-glow-blue transition-all"
            >
              {savedXtream ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
              <span>{savedXtream ? 'Credentials Saved!' : 'Save TV Credentials'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Auto-Check Heartbeat & History Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auto Check Configuration */}
        <div className="p-6 rounded-3xl bg-nx-card border border-nx-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-400" />
              <span>Channel Health Auto-Check</span>
            </h3>
            {savedAutoCheck && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-fade-in">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
          <p className="text-xs text-nx-muted leading-relaxed">
            Periodically checks streams in the background to ensure all live channels and satellite transponders remain verified and active.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { label: 'Every 30 sec (Fast)', val: 30 },
              { label: 'Every 1 min', val: 60 },
              { label: 'Every 5 min', val: 300 },
              { label: 'Disabled (Manual)', val: 0 }
            ].map(item => (
              <button
                key={item.val}
                type="button"
                onClick={() => handleUpdateAutoCheck(item.val)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  autoCheckSecs === item.val
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm'
                    : 'bg-nx-bg border-nx-border text-nx-muted hover:border-white hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Watch History Controls */}
        <div className="p-6 rounded-3xl bg-nx-card border border-nx-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" />
              <span>Watch History Privacy</span>
            </h3>
            {clearedHistoryMsg && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-fade-in">
                <Check className="w-3.5 h-3.5" /> Cleared
              </span>
            )}
          </div>
          <p className="text-xs text-nx-muted leading-relaxed">
            Recently watched channels are stored locally in your SQLite database. You can purge all playback logs and channel history at any time.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleClearHistory}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 border border-rose-500/40 hover:border-rose-500 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Entire Watch History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Localhost Storage & Privacy Banner */}
      <div className="p-6 rounded-3xl bg-nx-card border border-nx-border space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <span>Local Storage & Privacy Status</span>
        </h3>
        <p className="text-xs text-nx-muted leading-relaxed">
          Nexonic IPTV v2 is 100% locally hosted. All database rows, playlists, channel health records, and viewing history are stored on your local SSD inside <code className="text-white bg-nx-bg px-1.5 py-0.5 rounded">local-data/</code>. No analytics, tracking, or cloud sync is active.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
          <div className="p-3 rounded-xl bg-nx-bg border border-nx-border">
            <span className="text-nx-muted block text-[10px]">Database Engine</span>
            <strong className="text-white">SQLite 3 (WAL Mode)</strong>
          </div>
          <div className="p-3 rounded-xl bg-nx-bg border border-nx-border">
            <span className="text-nx-muted block text-[10px]">Shared on network</span>
            <strong className="text-white">{settings?.shared_on_network ? 'Yes' : 'No (this computer only)'}</strong>
          </div>
          <div className="p-3 rounded-xl bg-nx-bg border border-nx-border">
            <span className="text-nx-muted block text-[10px]">LAN IP Address</span>
            <strong className="text-emerald-400 font-mono">{settings?.local_ip || '127.0.0.1'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
