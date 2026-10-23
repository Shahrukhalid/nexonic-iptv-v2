import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Channel, NowNextProgram } from '../types';
import { fetchNowNext, toggleFavorite, recordHistory } from '../services/api';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Shield,
  Tv,
  Heart,
  Settings,
  Layers,
  Radio,
  ExternalLink
} from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';

interface PlayerProps {
  channel: Channel | null;
  onClose?: () => void;
  onNextWorkingChannel?: () => void;
}

export const Player: React.FC<PlayerProps> = ({ channel, onClose, onNextWorkingChannel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const [activeUrlIndex, setActiveUrlIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [availableLevels, setAvailableLevels] = useState<string[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [epgData, setEpgData] = useState<NowNextProgram>({ current: null, next: null });
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  const streamList = React.useMemo(() => {
    if (!channel) return [];
    let fallbacks: string[] = [];
    try {
      fallbacks = JSON.parse(channel.fallback_urls || '[]');
    } catch {
      fallbacks = [];
    }
    return [channel.stream_url, ...fallbacks.filter(u => u !== channel.stream_url)];
  }, [channel]);

  const currentStreamUrl = streamList[activeUrlIndex] || (channel ? channel.stream_url : '');

  // Record watch history & fetch EPG when channel changes
  useEffect(() => {
    if (channel) {
      setIsFavorite(Boolean(channel.is_favorite));
      recordHistory(channel.id).catch(() => {});
      if (channel.epg_id) {
        fetchNowNext(channel.epg_id).then(setEpgData).catch(() => {});
      } else {
        setEpgData({ current: null, next: null });
      }
      setActiveUrlIndex(0);
      setUseProxy(false);
      setErrorMsg(null);
    }
  }, [channel]);

  // Load and play HLS stream
  useEffect(() => {
    if (!channel || !videoRef.current || !currentStreamUrl) return;

    const video = videoRef.current;
    setErrorMsg(null);

    const isLocalMedia =
      currentStreamUrl.startsWith('/') ||
      currentStreamUrl.includes('/api/offline-media/') ||
      currentStreamUrl.includes('localhost') ||
      currentStreamUrl.includes('127.0.0.1');

    const isDirectMp4 =
      currentStreamUrl.endsWith('.mp4') ||
      channel.stream_protocol === 'mp4' ||
      isLocalMedia;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isDirectMp4) {
      video.src = currentStreamUrl;
      video.loop = Boolean(
        currentStreamUrl.includes('nexonic_') ||
        currentStreamUrl.includes('colorbars') ||
        currentStreamUrl.includes('standby') ||
        currentStreamUrl.includes('calibration')
      );
      video.load();
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      return;
    }

    // Determine target URL: direct-first or via local CORS proxy if needed
    const finalStreamUrl = useProxy && !isLocalMedia
      ? `/api/proxy/stream?url=${encodeURIComponent(currentStreamUrl)}`
      : currentStreamUrl;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        liveSyncDurationCount: 3,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        fragLoadingTimeOut: 30000,
        manifestLoadingTimeOut: 25000,
        levelLoadingTimeOut: 25000,
        manifestLoadingMaxRetry: 6,
        levelLoadingMaxRetry: 6,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        manifestLoadingRetryDelay: 1000,
      });

      hlsRef.current = hls;
      hls.loadSource(finalStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsPlaying(true);
        setErrorMsg(null);
        video.play().catch(() => {
          setIsPlaying(false);
        });
        const levels = data.levels.map(l => (l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}k`));
        setAvailableLevels(levels);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (!useProxy && !isLocalMedia) {
                // Direct playback network/CORS error: automatically try local stream proxy
                console.warn('Direct stream fetch blocked; transparently trying local proxy...');
                setUseProxy(true);
                setErrorMsg(null);
              } else if (activeUrlIndex < streamList.length - 1) {
                // Try next fallback stream URL
                console.warn('Switching to next fallback stream URL...');
                setActiveUrlIndex(prev => prev + 1);
                setUseProxy(true);
                setErrorMsg(null);
              } else {
                hls.destroy();
                if (channel.status === 'REGION RESTRICTED' || channel.access_restriction === 'REGION RESTRICTED') {
                  setErrorMsg(`Geographic Restriction: This stream is restricted by the broadcaster to viewers within ${channel.country || 'their home territory'}. Nexonic IPTV v2 strictly honors regional broadcast rights and does not bypass geo-restrictions.`);
                } else {
                  setErrorMsg('Playback failed: Upstream broadcast server is offline or unreachable.');
                }
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setErrorMsg(`Playback error: ${data.details || 'Stream discontinued by provider'}`);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari / Apple HLS
      video.src = finalStreamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
        setIsPlaying(true);
      });
    } else {
      setErrorMsg('HLS playback is not supported in this browser.');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel, currentStreamUrl, useProxy]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleFavoriteToggle = async () => {
    if (!channel) return;
    try {
      const res = await toggleFavorite(channel.id);
      setIsFavorite(res.is_favorite);
    } catch {
      // Ignored
    }
  };

  if (!channel) {
    return (
      <div className="w-full aspect-video bg-nx-surface rounded-2xl flex flex-col items-center justify-center border border-nx-border p-6 text-center">
        <Tv className="w-16 h-16 text-nx-muted mb-4 opacity-40 animate-pulse" />
        <h3 className="text-xl font-bold text-white mb-2">Nexonic IPTV v2 Player</h3>
        <p className="text-nx-muted text-sm max-w-sm">
          Select any channel from the list, country explorer, or search to start streaming live TV.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-nx-border shadow-2xl group select-none"
      onMouseMove={() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3500);
      }}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        onClick={handlePlayPause}
        playsInline
      />

      {/* Top Channel Header Overlay */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-3">
          {channel.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="w-10 h-10 object-contain rounded-lg bg-black/40 p-1 border border-white/10"
              onError={e => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-nx-primary/20 flex items-center justify-center font-bold text-lg text-nx-primary border border-nx-primary/30">
              {channel.country_flag}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">{channel.name}</h2>
              <span className="text-base">{channel.country_flag}</span>
              <VerificationBadge status={channel.status} resolution={channel.resolution} responseTimeMs={channel.response_time_ms} />
            </div>
            <p className="text-xs text-nx-muted flex items-center gap-2">
              <span>{channel.country}</span>
              <span>•</span>
              <span>{channel.category}</span>
              {useProxy && <span className="text-emerald-400 font-semibold">• Local Proxy Enabled</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch Fallback Streams if Multiple Exist */}
          {streamList.length > 1 && (
            <button
              onClick={() => setActiveUrlIndex((activeUrlIndex + 1) % streamList.length)}
              className="px-2.5 py-1 text-xs rounded-lg bg-nx-surface/80 border border-nx-border hover:border-nx-primary text-white flex items-center gap-1.5 transition-colors"
              title="Switch to backup stream"
            >
              <Radio className="w-3.5 h-3.5 text-nx-primary" />
              <span>Stream #{activeUrlIndex + 1}/{streamList.length}</span>
            </button>
          )}

          <button
            onClick={handleFavoriteToggle}
            className={`p-2 rounded-lg border transition-colors ${
              isFavorite
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-black/40 border-white/10 text-white hover:text-rose-400'
            }`}
            title="Favorite channel"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Overlay with Actions */}
      {errorMsg && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
          <Shield className="w-12 h-12 text-rose-500 mb-3" />
          <h4 className="text-lg font-bold text-white mb-1">Playback Limitation</h4>
          <p className="text-sm text-nx-muted max-w-md mb-6">{errorMsg}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {onNextWorkingChannel && (
              <button
                onClick={() => {
                  setErrorMsg(null);
                  onNextWorkingChannel();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play Next Working Channel</span>
              </button>
            )}
            <button
              onClick={() => {
                setErrorMsg(null);
                setUseProxy(!useProxy);
              }}
              className="px-4 py-2 rounded-xl bg-nx-primary hover:bg-nx-primary-hover text-white text-sm font-semibold flex items-center gap-2 shadow-glow-blue transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{useProxy ? 'Switch to Direct Stream (No Proxy)' : 'Switch to Stream Relay Proxy'}</span>
            </button>
            <button
              onClick={() => {
                setErrorMsg(null);
                setUseProxy(false);
                setActiveUrlIndex(0);
                if (videoRef.current) {
                  videoRef.current.load();
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="px-4 py-2 rounded-xl bg-nx-surface border border-nx-border hover:border-white text-white text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Stream</span>
            </button>
            {streamList.length > 1 && (
              <button
                onClick={() => {
                  setActiveUrlIndex((activeUrlIndex + 1) % streamList.length);
                  setUseProxy(false);
                  setErrorMsg(null);
                }}
                className="px-4 py-2 rounded-xl bg-nx-surface border border-nx-border hover:border-white text-white text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Layers className="w-4 h-4" />
                <span>Try Fallback Stream #{((activeUrlIndex + 1) % streamList.length) + 1}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Control Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-300 z-10 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* EPG Program Banner (if available) */}
        {epgData.current && (
          <div className="text-xs text-white/90 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-white">LIVE: {epgData.current.title}</span>
              {epgData.current.description && (
                <span className="text-nx-muted truncate max-w-md hidden md:inline">
                  — {epgData.current.description}
                </span>
              )}
            </div>
            {epgData.next && (
              <span className="text-nx-muted hidden lg:inline">Next: {epgData.next.title}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="p-2 rounded-xl bg-nx-primary hover:bg-nx-primary-hover text-white transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* Volume & Mute */}
            <div className="flex items-center gap-2 group/vol">
              <button onClick={toggleMute} className="text-white hover:text-nx-primary transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 accent-nx-primary cursor-pointer h-1.5 bg-white/20 rounded-lg"
              />
            </div>

            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-600/80 text-white tracking-widest uppercase">
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Stream Quality Selector */}
            {availableLevels.length > 0 && (
              <select
                value={currentLevel}
                onChange={e => {
                  const idx = parseInt(e.target.value);
                  setCurrentLevel(idx);
                  if (hlsRef.current) hlsRef.current.currentLevel = idx;
                }}
                className="bg-nx-surface/90 border border-nx-border text-xs rounded-lg px-2 py-1 text-white focus:outline-none focus:border-nx-primary cursor-pointer"
              >
                <option value={-1}>Auto Quality</option>
                {availableLevels.map((lvl, i) => (
                  <option key={i} value={i}>
                    {lvl}
                  </option>
                ))}
              </select>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white hover:text-nx-primary transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
