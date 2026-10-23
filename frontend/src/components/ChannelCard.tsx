import React, { useState } from 'react';
import { Channel } from '../types';
import { VerificationBadge } from './VerificationBadge';
import { toggleFavorite, testChannel } from '../services/api';
import { Play, Heart, RefreshCw, Radio } from 'lucide-react';

interface ChannelCardProps {
  channel: Channel;
  isActive?: boolean;
  onSelect: (channel: Channel) => void;
  onUpdated?: (updated: Channel) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  isActive = false,
  onSelect,
  onUpdated
}) => {
  const [isFav, setIsFav] = useState(Boolean(channel.is_favorite));
  const [isTesting, setIsTesting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await toggleFavorite(channel.id);
      setIsFav(res.is_favorite);
      if (onUpdated) {
        onUpdated({ ...channel, is_favorite: res.is_favorite ? 1 : 0 });
      }
    } catch {
      // Ignored
    }
  };

  const handleQuickTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTesting(true);
    try {
      const res = await testChannel(channel.id);
      if (onUpdated) {
        onUpdated({
          ...channel,
          status: res.status,
          status_reason: res.reason,
          response_time_ms: res.response_time_ms,
          resolution: res.resolution || channel.resolution,
          video_codec: res.video_codec || channel.video_codec
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div
      onClick={() => onSelect(channel)}
      className={`group relative p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
        isActive
          ? 'bg-nx-card border-nx-primary shadow-glow-blue scale-[1.02]'
          : 'bg-nx-surface/80 hover:bg-nx-card border-nx-border hover:border-nx-primary/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Channel Logo / Placeholder */}
        <div className="relative w-12 h-12 rounded-xl bg-nx-bg border border-nx-border flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-nx-primary/60 transition-colors">
          {channel.logo && !imgError ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="w-full h-full object-contain p-1"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <span className="text-xl">{channel.country_flag}</span>
          )}

          {/* Quick Play overlay icon on hover */}
          <div className="absolute inset-0 bg-nx-primary/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* Channel Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <h4
              className={`text-sm font-semibold truncate ${
                isActive ? 'text-nx-primary font-bold' : 'text-white group-hover:text-nx-primary'
              } transition-colors`}
              title={channel.name}
            >
              {channel.name}
            </h4>
            <span className="text-sm flex-shrink-0">{channel.country_flag}</span>
          </div>

          <div className="flex items-center gap-2 mb-2 text-xs text-nx-muted">
            <span className="truncate max-w-[90px]">{channel.category}</span>
            <span>•</span>
            <span className="truncate">{channel.country}</span>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex items-center justify-between gap-1">
            <VerificationBadge
              status={channel.status}
              responseTimeMs={channel.response_time_ms}
              reason={channel.status_reason}
              resolution={channel.resolution}
              showDetails={true}
            />

            <div className="flex items-center gap-1">
              {/* Quick Retest Button */}
              <button
                onClick={handleQuickTest}
                disabled={isTesting}
                title="Retest this stream now"
                className="p-1 rounded-lg text-nx-muted hover:text-white hover:bg-nx-border/60 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-nx-primary' : ''}`} />
              </button>

              {/* Favorite Button */}
              <button
                onClick={handleFavorite}
                title="Favorite channel"
                className={`p-1 rounded-lg transition-colors ${
                  isFav ? 'text-rose-500' : 'text-nx-muted hover:text-rose-400'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
