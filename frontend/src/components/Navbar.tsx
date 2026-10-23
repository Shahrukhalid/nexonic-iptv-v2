import React, { useState } from 'react';
import { Search, Tv, Activity, Sparkles } from 'lucide-react';
import { ConnectInfo } from '../types';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenConnectTv: () => void;
  workingCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenConnectTv,
  workingCount
}) => {
  return (
    <header className="h-16 border-b border-nx-border bg-nx-surface/90 backdrop-blur-md sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Brand Identity */}
      <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-nx-primary via-indigo-600 to-nx-accent p-0.5 shadow-glow-blue flex items-center justify-center">
          <div className="w-full h-full bg-nx-bg rounded-[10px] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path
                d="M5 3L19 12L5 21V3Z"
                fill="url(#nx-nav-grad)"
                stroke="#38BDF8"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="nx-nav-grad" x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0066FF" />
                  <stop offset="1" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-extrabold tracking-tight text-white font-sans">
              NEXONIC <span className="text-nx-primary">IPTV</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-nx-primary/20 text-nx-primary rounded border border-nx-primary/40">
              V2
            </span>
          </div>
          <p className="text-[10px] text-nx-muted hidden sm:block tracking-wider font-medium uppercase">
            Worldwide Live TV & Series
          </p>
        </div>
      </div>

      {/* Global Instant Search */}
      <div className="flex-1 max-w-xl mx-2">
        <div className="relative">
          <Search className="w-4 h-4 text-nx-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search channels, countries, languages, categories..."
            className="w-full pl-10 pr-4 py-2 bg-nx-bg border border-nx-border rounded-xl text-sm text-white placeholder-nx-muted focus:outline-none focus:border-nx-primary focus:ring-1 focus:ring-nx-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-nx-muted hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2.5">
        {/* Smart TV Connect Button */}
        <button
          onClick={onOpenConnectTv}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-nx-primary/20 to-nx-accent/20 border border-nx-primary/40 hover:border-nx-primary text-white text-xs font-semibold shadow-glow-blue transition-all"
          title="Connect Smart TV via Xtream Codes"
        >
          <Tv className="w-4 h-4 text-nx-primary animate-pulse" />
          <span className="hidden sm:inline">Connect Smart TV</span>
        </button>
      </div>
    </header>
  );
};
