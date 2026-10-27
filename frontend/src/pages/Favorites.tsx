import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Channel } from '../types';
import { fetchChannels } from '../services/api';
import { ChannelCard } from '../components/ChannelCard';
import { Player } from '../components/Player';
import { Heart, Tv } from 'lucide-react';

interface FavoritesProps {
  onSelectChannel: (channel: Channel) => void;
  activeChannel: Channel | null;
}

export const Favorites: React.FC<FavoritesProps> = ({
  onSelectChannel,
  activeChannel }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  // Each load gets a number; only the newest one may update state (fast toggles can resolve out of order).
  const latest = useRef(0);
  const mounted = useRef(true);
  const activeRef = useRef(activeChannel);
  activeRef.current = activeChannel;

  const loadFavorites = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    try {
      const res = await fetchChannels({
        is_favorite: true,
        page_size: 100
      });
      if (!mounted.current || id !== latest.current) return;
      setChannels(res.items);
      if (!activeRef.current && res.items.length > 0) {
        onSelectChannel(res.items[0]);
      }
    } catch {
      if (mounted.current && id === latest.current) setChannels([]);
    } finally {
      if (mounted.current && id === latest.current) setLoading(false);
    }
  }, [onSelectChannel]);

  useEffect(() => {
    mounted.current = true;
    loadFavorites();
    return () => { mounted.current = false; };
    // Load once on mount; later reloads come from onUpdated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
          <span>Favorite Channels</span>
        </h1>
        <p className="text-xs text-nx-muted">
          Your bookmarked worldwide channels for quick access
        </p>
      </div>

      {activeChannel && activeChannel.is_favorite === 1 && (
        <div className="w-full max-w-5xl mx-auto">
          <Player channel={activeChannel} />
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-nx-muted">Loading favorites...</div>
      ) : channels.length === 0 ? (
        <div className="py-16 text-center text-nx-muted bg-nx-surface rounded-2xl border border-nx-border p-6">
          <Heart className="w-12 h-12 text-rose-500/40 mx-auto mb-3" />
          <h4 className="text-base font-bold text-white mb-1">No favorites saved yet</h4>
          <p className="text-xs max-w-sm mx-auto">
            Click the heart icon on any channel card while browsing to save it to your favorites.
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
              onUpdated={loadFavorites}
            />
          ))}
        </div>
      )}
    </div>
  );
};
