import {
  Channel,
  ChannelListResponse,
  CountryStat,
  CategoryStat,
  SatelliteStat,
  VerificationProgress,
  StatsSummary,
  Source,
  NowNextProgram,
  Playlist,
  AppSettings,
  ConnectInfo
} from '../types';

const BASE_URL = '';

export async function fetchChannels(params: {
  country?: string;
  category?: string;
  status?: string;
  search?: string;
  is_series?: boolean;
  is_favorite?: boolean;
  is_live?: boolean;
  is_vod?: boolean;
  is_satellite?: boolean;
  satellite_network?: string;
  sort_by?: string;
  page?: number;
  page_size?: number;
}): Promise<ChannelListResponse> {
  const query = new URLSearchParams();
  if (params.country) query.set('country', params.country);
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.is_series !== undefined) query.set('is_series', String(params.is_series));
  if (params.is_favorite !== undefined) query.set('is_favorite', String(params.is_favorite));
  if (params.is_live !== undefined) query.set('is_live', String(params.is_live));
  if (params.is_vod !== undefined) query.set('is_vod', String(params.is_vod));
  if (params.is_satellite !== undefined) query.set('is_satellite', String(params.is_satellite));
  if (params.satellite_network) query.set('satellite_network', params.satellite_network);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));

  const res = await fetch(`${BASE_URL}/api/channels?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch channels');
  return res.json();
}

export async function fetchChannel(id: number): Promise<Channel> {
  const res = await fetch(`${BASE_URL}/api/channels/${id}`);
  if (!res.ok) throw new Error('Failed to fetch channel');
  return res.json();
}

export async function toggleFavorite(channelId: number): Promise<{ channel_id: number; is_favorite: boolean }> {
  const res = await fetch(`${BASE_URL}/api/channels/${channelId}/favorite`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle favorite');
  return res.json();
}

export async function recordHistory(channelId: number): Promise<void> {
  await fetch(`${BASE_URL}/api/channels/history/${channelId}`, { method: 'POST' });
}

export async function fetchHistory(): Promise<Channel[]> {
  const res = await fetch(`${BASE_URL}/api/channels/history`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function clearHistory(): Promise<void> {
  await fetch(`${BASE_URL}/api/channels/history`, { method: 'DELETE' });
}

export async function fetchStatsSummary(): Promise<StatsSummary> {
  const res = await fetch(`${BASE_URL}/api/channels/stats/summary`);
  if (!res.ok) throw new Error('Failed to fetch stats summary');
  return res.json();
}

export async function fetchCountryStats(): Promise<CountryStat[]> {
  const res = await fetch(`${BASE_URL}/api/channels/stats/countries`);
  if (!res.ok) throw new Error('Failed to fetch country stats');
  return res.json();
}

export async function fetchCategoryStats(isVod?: boolean): Promise<CategoryStat[]> {
  const query = new URLSearchParams();
  if (isVod !== undefined) query.set('is_vod', String(isVod));
  const res = await fetch(`${BASE_URL}/api/channels/stats/categories?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch category stats');
  return res.json();
}

export async function fetchSatelliteStats(): Promise<SatelliteStat[]> {
  const res = await fetch(`${BASE_URL}/api/channels/stats/satellites`);
  if (!res.ok) throw new Error('Failed to fetch satellite stats');
  return res.json();
}

export async function fetchOfflineFiles() {
  const res = await fetch(`${BASE_URL}/api/offline-media/files`);
  if (!res.ok) throw new Error('Failed to fetch offline media');
  return res.json();
}

export async function scanOfflineMedia() {
  const res = await fetch(`${BASE_URL}/api/offline-media/scan`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to scan offline media');
  return res.json();
}

export async function testChannel(channelId: number) {
  const res = await fetch(`${BASE_URL}/api/verification/test-channel/${channelId}`, { method: 'POST' });
  if (!res.ok) throw new Error('Test failed');
  return res.json();
}

export async function startBatchVerification(scope = 'unverified', limit = 100) {
  const res = await fetch(`${BASE_URL}/api/verification/batch?scope=${scope}&limit=${limit}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to start batch test');
  return res.json();
}

export async function fetchVerificationStats(): Promise<VerificationProgress> {
  const res = await fetch(`${BASE_URL}/api/verification/stats`);
  if (!res.ok) throw new Error('Failed to fetch verification stats');
  return res.json();
}

export async function pauseVerification() {
  await fetch(`${BASE_URL}/api/verification/pause`, { method: 'POST' });
}

export async function resumeVerification() {
  await fetch(`${BASE_URL}/api/verification/resume`, { method: 'POST' });
}

export async function cancelVerification() {
  await fetch(`${BASE_URL}/api/verification/cancel`, { method: 'POST' });
}

export async function startAutoAudit(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/verification/auto-audit/start`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start auto-audit');
  return res.json();
}

export async function stopAutoAudit(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/verification/auto-audit/stop`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to stop auto-audit');
  return res.json();
}

export async function fetchAutoAuditStatus(): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/verification/auto-audit/status`);
  if (!res.ok) throw new Error('Failed to fetch auto-audit status');
  return res.json();
}

export async function fetchAutoCheckConfig(): Promise<{
  interval_seconds: number;
  is_enabled: boolean;
  is_running: boolean;
  last_auto_check: string | null;
}> {
  const res = await fetch(`${BASE_URL}/api/verification/auto-check`);
  if (!res.ok) throw new Error('Failed to fetch auto-check status');
  return res.json();
}

export async function setAutoCheckInterval(seconds: number): Promise<{
  status: string;
  interval_seconds: number;
  is_enabled: boolean;
}> {
  const res = await fetch(`${BASE_URL}/api/verification/auto-check?interval_seconds=${seconds}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to update auto-check interval');
  return res.json();
}

export async function fetchSources(): Promise<Source[]> {
  const res = await fetch(`${BASE_URL}/api/sources`);
  if (!res.ok) throw new Error('Failed to fetch sources');
  return res.json();
}

export async function addSource(name: string, url: string) {
  const res = await fetch(`${BASE_URL}/api/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, url })
  });
  if (!res.ok) throw new Error('Failed to add source');
  return res.json();
}

export async function refreshSource(sourceId: number) {
  const res = await fetch(`${BASE_URL}/api/sources/${sourceId}/refresh`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to refresh source');
  return res.json();
}

export async function autoDiscoverChannels(): Promise<{
  status: string;
  scanned_sources: number;
  new_channels_added: number;
  channels_updated: number;
  total_channels: number;
  working_channels: number;
  errors?: string[];
}> {
  const res = await fetch(`${BASE_URL}/api/sources/auto-discover`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Auto-discovery failed');
  return res.json();
}

export async function deleteSource(sourceId: number) {
  const res = await fetch(`${BASE_URL}/api/sources/${sourceId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete source');
  return res.json();
}

export async function uploadPlaylist(file: File, name?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);

  const res = await fetch(`${BASE_URL}/api/sources/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload playlist');
  return res.json();
}

export async function fetchNowNext(epgId: string): Promise<NowNextProgram> {
  if (!epgId) return { current: null, next: null };
  const res = await fetch(`${BASE_URL}/api/epg/now-next/${encodeURIComponent(epgId)}`);
  if (!res.ok) return { current: null, next: null };
  return res.json();
}

export async function fetchPlaylists(): Promise<Playlist[]> {
  const res = await fetch(`${BASE_URL}/api/playlists`);
  if (!res.ok) throw new Error('Failed to fetch playlists');
  return res.json();
}

export async function createPlaylist(name: string, description?: string, channelIds: number[] = []) {
  const res = await fetch(`${BASE_URL}/api/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, channel_ids: channelIds })
  });
  if (!res.ok) throw new Error('Failed to create playlist');
  return res.json();
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch(`${BASE_URL}/api/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function fetchConnectInfo(): Promise<ConnectInfo> {
  const res = await fetch(`${BASE_URL}/api/settings/connect-info`);
  if (!res.ok) throw Object.assign(new Error('Failed to fetch connect info'), { status: res.status });
  return res.json();
}

export async function updateXtreamCredentials(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/settings/xtream-credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error('Failed to update Xtream credentials');
  return res.json();
}
