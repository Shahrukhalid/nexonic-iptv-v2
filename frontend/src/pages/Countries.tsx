import React, { useEffect, useState } from 'react';
import { CountryStat } from '../types';
import { fetchCountryStats } from '../services/api';
import { Search, Globe2, CheckCircle2, ArrowUpDown } from 'lucide-react';

interface CountriesProps {
  onSelectCountry: (countryCode: string) => void;
}

export const Countries: React.FC<CountriesProps> = ({ onSelectCountry }) => {
  const [countries, setCountries] = useState<CountryStat[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'total' | 'working' | 'name'>('total');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchCountryStats()
      .then(data => { if (active) setCountries(data); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredCountries = countries
    .filter(
      c =>
        c.country.toLowerCase().includes(search.toLowerCase()) ||
        c.country_code.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'total') return b.total - a.total;
      if (sortBy === 'working') return b.working - a.working;
      return a.country.localeCompare(b.country);
    });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe2 className="w-6 h-6 text-indigo-400" />
            <span>Country Explorer</span>
          </h1>
          <p className="text-xs text-nx-muted">
            Explore live television channels across {countries.length} worldwide countries
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-nx-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search countries..."
              className="pl-9 pr-3 py-1.5 rounded-xl bg-nx-surface border border-nx-border text-xs text-white placeholder-nx-muted focus:outline-none focus:border-nx-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-nx-muted bg-nx-surface border border-nx-border rounded-xl px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-nx-primary" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value="total" className="bg-nx-surface">Most Channels</option>
              <option value="working" className="bg-nx-surface">Most Working</option>
              <option value="name" className="bg-nx-surface">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-nx-muted">Loading country catalog...</div>
      ) : error ? (
        <div className="py-20 text-center text-rose-400">Could not load countries: {error}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCountries.map(c => (
            <div
              key={c.country_code}
              onClick={() => onSelectCountry(c.country_code)}
              className="p-4 rounded-2xl bg-nx-surface hover:bg-nx-card border border-nx-border hover:border-nx-primary/60 cursor-pointer transition-all duration-200 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl p-1 bg-nx-bg rounded-xl border border-nx-border group-hover:scale-110 transition-transform">
                  {c.country_flag}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white group-hover:text-nx-primary transition-colors truncate">
                    {c.country}
                  </h3>
                  <span className="text-[11px] font-mono text-nx-muted uppercase">
                    {c.country_code}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-nx-border/60">
                <div className="p-2 rounded-xl bg-nx-bg/60 border border-nx-border/40">
                  <span className="text-[10px] text-nx-muted block">Total Channels</span>
                  <strong className="text-white text-sm">{c.total}</strong>
                </div>
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 block">Verified Working</span>
                  <strong className="text-emerald-400 text-sm">{c.working}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
