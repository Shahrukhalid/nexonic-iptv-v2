import React, { useState, useEffect } from 'react';
import { Channel } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar, NavItem } from './components/Sidebar';
import { ConnectTvModal } from './components/ConnectTvModal';

import { Home } from './pages/Home';
import { LiveTv } from './pages/LiveTv';
import { Countries } from './pages/Countries';
import { Categories } from './pages/Categories';
import { Series } from './pages/Series';
import { OfflineChannels } from './pages/OfflineChannels';
import { SatelliteChannels } from './pages/SatelliteChannels';
import { EpgGuide } from './pages/EpgGuide';
import { HealthCenter } from './pages/HealthCenter';
import { Sources } from './pages/Sources';
import { Playlists } from './pages/Playlists';
import { Favorites } from './pages/Favorites';
import { History } from './pages/History';
import { ConnectTv } from './pages/ConnectTv';
import { Settings } from './pages/Settings';
import { fetchVerificationStats } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavItem>('home');
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayload, setFilterPayload] = useState<any>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [workingCount, setWorkingCount] = useState(0);

  useEffect(() => {
    fetchVerificationStats()
      .then(s => {
        setWorkingCount(s.working || 0);
      })
      .catch(() => {});
  }, []);

  const handleNavigate = (tab: NavItem, payload?: any) => {
    setCurrentTab(tab);
    if (payload) {
      setFilterPayload(payload);
    } else {
      setFilterPayload(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && currentTab !== 'livetv') {
      setCurrentTab('livetv');
    }
  };

  const handleSelectCountry = (countryCode: string) => {
    handleNavigate('livetv', { country: countryCode });
  };

  const handleSelectCategory = (category: string) => {
    handleNavigate('livetv', { category });
  };

  return (
    <div className="min-h-screen bg-nx-bg flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onOpenConnectTv={() => setShowConnectModal(true)}
        workingCount={workingCount}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={tab => handleNavigate(tab)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {currentTab === 'home' && (
            <Home
              onSelectChannel={ch => {
                setActiveChannel(ch);
                handleNavigate('livetv');
              }}
              onNavigate={(tab, filter) => handleNavigate(tab, filter)}
              onOpenConnectTv={() => setShowConnectModal(true)}
            />
          )}

          {currentTab === 'livetv' && (
            <LiveTv
              activeChannel={activeChannel}
              onSelectChannel={setActiveChannel}
              initialFilter={filterPayload}
              searchQuery={searchQuery}
            />
          )}

          {currentTab === 'satellite' && (
            <SatelliteChannels
              onSelectChannel={setActiveChannel}
              activeChannel={activeChannel}
              searchQuery={searchQuery}
            />
          )}

          {currentTab === 'offline' && (
            <OfflineChannels
              onSelectChannel={setActiveChannel}
              activeChannel={activeChannel}
            />
          )}

          {currentTab === 'countries' && (
            <Countries
              onSelectCountry={handleSelectCountry}
            />
          )}

          {currentTab === 'categories' && (
            <Categories
              onSelectCategory={handleSelectCategory}
            />
          )}

          {currentTab === 'series' && (
            <Series
              onSelectChannel={setActiveChannel}
              activeChannel={activeChannel}
            />
          )}

          {currentTab === 'epg' && (
            <EpgGuide
              onSelectChannel={ch => {
                setActiveChannel(ch);
                handleNavigate('livetv');
              }}
            />
          )}

          {currentTab === 'health' && (
            <HealthCenter
              onSelectChannel={ch => {
                setActiveChannel(ch);
                handleNavigate('livetv');
              }}
            />
          )}

          {currentTab === 'sources' && <Sources />}

          {currentTab === 'favorites' && (
            <Favorites
              onSelectChannel={setActiveChannel}
              activeChannel={activeChannel}
            />
          )}

          {currentTab === 'history' && (
            <History
              onSelectChannel={setActiveChannel}
              activeChannel={activeChannel}
            />
          )}

          {currentTab === 'connect-tv' && <ConnectTv />}

          {currentTab === 'settings' && <Settings />}
        </main>
      </div>

      {/* Smart TV connection modal */}
      <ConnectTvModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />
    </div>
  );
};
