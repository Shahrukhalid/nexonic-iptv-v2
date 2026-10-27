import React, { useEffect, useState } from 'react';
import { CategoryStat } from '../types';
import { fetchCategoryStats } from '../services/api';
import {
  Grid,
  Newspaper,
  Film,
  Trophy,
  Tv,
  Music,
  Smile,
  BookOpen,
  Church,
  Radio,
  Search,
  ArrowDownAZ
} from 'lucide-react';

interface CategoriesProps {
  onSelectCategory: (category: string) => void;
}

export const Categories: React.FC<CategoriesProps> = ({ onSelectCategory }) => {
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchCategoryStats()
      .then(cats => {
        if (!active) return;
        // Enforce clean alphabetical sorting
        const sorted = [...cats].sort((a, b) => a.category.localeCompare(b.category));
        setCategories(sorted);
      })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('news')) return <Newspaper className="w-6 h-6 text-sky-400" />;
    if (n.includes('sport')) return <Trophy className="w-6 h-6 text-amber-400" />;
    if (n.includes('movie') || n.includes('cinema')) return <Film className="w-6 h-6 text-purple-400" />;
    if (n.includes('series')) return <Tv className="w-6 h-6 text-indigo-400" />;
    if (n.includes('music')) return <Music className="w-6 h-6 text-rose-400" />;
    if (n.includes('kids') || n.includes('animation')) return <Smile className="w-6 h-6 text-yellow-400" />;
    if (n.includes('doc') || n.includes('science')) return <BookOpen className="w-6 h-6 text-emerald-400" />;
    if (n.includes('religio') || n.includes('faith')) return <Church className="w-6 h-6 text-teal-400" />;
    return <Radio className="w-6 h-6 text-nx-primary" />;
  };

  // Distinct alphabet letters + '#' for symbols/numbers
  const letters = Array.from(
    new Set(
      categories.map(c => {
        const first = c.category.charAt(0).toUpperCase();
        return /[A-Z]/.test(first) ? first : '#';
      })
    )
  ).sort((a, b) => {
    if (a === '#') return -1;
    if (b === '#') return 1;
    return a.localeCompare(b);
  });

  const filteredCategories = categories.filter(c => {
    const matchesSearch = c.category.toLowerCase().includes(search.toLowerCase());
    let matchesLetter = true;
    if (selectedLetter === '#') {
      matchesLetter = !/^[A-Z]/i.test(c.category);
    } else if (selectedLetter !== 'ALL') {
      matchesLetter = c.category.toUpperCase().startsWith(selectedLetter);
    }
    return matchesSearch && matchesLetter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ArrowDownAZ className="w-6 h-6 text-nx-primary" />
            <span>Alphabetical Categories Explorer (A–Z)</span>
          </h1>
          <p className="text-xs text-nx-muted">
            All television categories sorted in alphabetical order for effortless discovery
          </p>
        </div>

        {/* Category Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-nx-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter categories..."
            className="pl-9 pr-3 py-1.5 rounded-xl bg-nx-surface border border-nx-border text-xs text-white placeholder-nx-muted focus:outline-none focus:border-nx-primary"
          />
        </div>
      </div>

      {/* Alphabetical Letter Quick Jump Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-2xl bg-nx-surface border border-nx-border">
        <button
          onClick={() => setSelectedLetter('ALL')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
            selectedLetter === 'ALL'
              ? 'bg-nx-primary text-white shadow-glow-blue'
              : 'text-nx-muted hover:text-white hover:bg-nx-bg'
          }`}
        >
          ALL
        </button>
        {letters.map(letter => (
          <button
            key={letter}
            onClick={() => setSelectedLetter(letter)}
            className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors flex items-center justify-center ${
              selectedLetter === letter
                ? 'bg-nx-primary text-white shadow-glow-blue'
                : 'text-nx-muted hover:text-white hover:bg-nx-bg'
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="py-20 text-center text-nx-muted">Loading categories...</div>
      ) : error ? (
        <div className="py-20 text-center text-rose-400">Could not load categories: {error}</div>
      ) : filteredCategories.length === 0 ? (
        <div className="py-12 text-center text-nx-muted bg-nx-surface rounded-2xl border border-nx-border">
          No categories found matching "{search}"
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCategories.map(cat => (
            <div
              key={cat.category}
              onClick={() => onSelectCategory(cat.category)}
              className="p-5 rounded-2xl bg-nx-surface hover:bg-nx-card border border-nx-border hover:border-nx-primary/60 cursor-pointer transition-all duration-200 group flex items-start gap-4"
            >
              <div className="p-3 rounded-xl bg-nx-bg border border-nx-border group-hover:scale-110 transition-transform">
                {getCategoryIcon(cat.category)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white group-hover:text-nx-primary transition-colors truncate mb-1">
                  {cat.category}
                </h3>
                <div className="flex items-center gap-3 text-xs text-nx-muted">
                  <span>{cat.count} Channels</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-medium">{cat.working} Working</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
