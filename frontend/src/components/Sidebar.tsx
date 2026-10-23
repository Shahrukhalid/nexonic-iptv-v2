import React from 'react';
import {
  Home,
  Tv,
  Radio,
  Globe2,
  Grid,
  Film,
  Calendar,
  Heart,
  History,
  Activity,
  Layers,
  Settings,
  Cast,
  HardDrive
} from 'lucide-react';

export type NavItem =
  | 'home'
  | 'livetv'
  | 'satellite'
  | 'offline'
  | 'countries'
  | 'categories'
  | 'series'
  | 'epg'
  | 'favorites'
  | 'history'
  | 'health'
  | 'sources'
  | 'connect-tv'
  | 'settings';

interface SidebarProps {
  currentTab: NavItem;
  onTabChange: (tab: NavItem) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'livetv', label: 'Live TV', icon: <Tv className="w-5 h-5" /> },
    { id: 'satellite', label: 'Dish & Satellite', icon: <Radio className="w-5 h-5 text-amber-400" /> },
    { id: 'offline', label: 'Offline & VOD', icon: <HardDrive className="w-5 h-5 text-emerald-400" /> },
    { id: 'countries', label: 'Countries', icon: <Globe2 className="w-5 h-5" /> },
    { id: 'categories', label: 'Categories', icon: <Grid className="w-5 h-5" /> },
    { id: 'series', label: 'TV Series', icon: <Film className="w-5 h-5" /> },
    { id: 'epg', label: 'TV Guide', icon: <Calendar className="w-5 h-5" /> },
    { id: 'favorites', label: 'Favorites', icon: <Heart className="w-5 h-5" /> },
    { id: 'history', label: 'Recently Watched', icon: <History className="w-5 h-5" /> },
    { id: 'health', label: 'Channel Health', icon: <Activity className="w-5 h-5" /> },
    { id: 'sources', label: 'Sources & Playlists', icon: <Layers className="w-5 h-5" /> },
    { id: 'connect-tv', label: 'Connect Smart TV', icon: <Cast className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 border-r border-nx-border bg-nx-surface/50 backdrop-blur-md flex flex-col justify-between p-4 flex-shrink-0 min-h-[calc(100vh-4rem)]">
      <nav className="space-y-1.5">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-nx-muted mb-2">
          Discover
        </p>
        {navItems.map(item => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as NavItem)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-nx-primary text-white shadow-glow-blue font-semibold'
                  : 'text-nx-muted hover:text-white hover:bg-nx-border/40'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-nx-muted'}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Localhost indicator badge at bottom */}
      <div className="pt-4 border-t border-nx-border/60">
        <div className="p-3 rounded-xl bg-nx-bg border border-nx-border text-xs flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div className="truncate">
            <p className="font-semibold text-white truncate">100% Local Engine</p>
            <p className="text-[11px] text-nx-muted truncate">Localhost • Private</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
