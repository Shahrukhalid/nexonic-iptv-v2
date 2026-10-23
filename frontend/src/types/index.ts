export type ChannelStatus =
  | 'WORKING'
  | 'UNSTABLE'
  | 'REGION RESTRICTED'
  | 'AUTHENTICATION REQUIRED'
  | 'SUBSCRIPTION REQUIRED'
  | 'DRM PROTECTED'
  | 'OFFLINE'
  | 'TIMEOUT'
  | 'INVALID STREAM'
  | 'UNVERIFIED'
  | 'UNKNOWN ERROR';

export interface Channel {
  id: number;
  name: string;
  alt_names?: string | null;
  country: string;
  country_code: string;
  country_flag: string;
  region?: string | null;
  language?: string | null;
  category: string;
  subcategory?: string | null;
  logo?: string | null;
  stream_url: string;
  fallback_urls: string;
  stream_protocol: string;
  source_name?: string | null;
  source_url?: string | null;
  epg_id?: string | null;
  description?: string | null;
  resolution?: string | null;
  video_codec?: string | null;
  audio_codec?: string | null;
  status: ChannelStatus;
  status_reason?: string | null;
  last_checked_at?: string | null;
  last_success_at?: string | null;
  response_time_ms?: number | null;
  access_restriction: string;
  is_adult: number;
  is_series: number;
  is_favorite?: number;
  is_live?: number;
  is_vod?: number;
  is_satellite?: number;
  user_tags?: string | null;
  custom_order: number;
}

export interface ChannelListResponse {
  items: Channel[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CountryStat {
  country_code: string;
  country: string;
  country_flag: string;
  total: number;
  working: number;
  unstable: number;
  offline: number;
  restricted: number;
  unverified: number;
}

export interface CategoryStat {
  category: string;
  count: number;
  working: number;
}

export interface SatelliteStat {
  network: string;
  count: number;
  working: number;
}

export interface VerificationProgress {
  is_running: boolean;
  is_paused: boolean;
  total_queued: number;
  completed: number;
  working: number;
  failed: number;
  current_channel: string;
  total_channels?: number;
  unverified?: number;
  offline?: number;
  unstable?: number;
  restricted?: number;
}

export interface AutoAuditStatus {
  is_active: boolean;
  total_audited_session: number;
  working_found_session: number;
  offline_found_session: number;
  restricted_found_session: number;
  current_batch_size: number;
  last_audit_time: string | null;
  concurrency: number;
}

export interface StatsSummary {
  total_channels: number;
  working_channels: number;
  offline_channels: number;
  unverified_channels: number;
  restricted_channels: number;
  unstable_channels: number;
  online_rate_percent: number;
  total_countries: number;
  total_series: number;
  total_satellite: number;
  total_vod: number;
  is_auto_audit_active?: boolean;
  auto_audit_status?: AutoAuditStatus;
  verification_progress?: VerificationProgress;
}

export interface Source {
  id: number;
  name: string;
  url: string;
  type: string;
  enabled: number;
  channel_count: number;
  working_count: number;
  failed_count: number;
  last_refreshed_at?: string | null;
  last_status?: string | null;
  attribution?: string | null;
  is_adult: number;
}

export interface EpgProgram {
  id: number;
  channel_epg_id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string | null;
  category?: string | null;
}

export interface NowNextProgram {
  current?: EpgProgram | null;
  next?: EpgProgram | null;
}

export interface Playlist {
  id: number;
  name: string;
  description?: string | null;
  channel_ids: string;
  is_adult: number;
  created_at: string;
}

export interface AppSettings {
  auto_refresh_hours: number;
  verification_concurrency: number;
  local_ip: string;
  port: number;
  shared_on_network?: boolean;
}

export interface ConnectInfo {
  app_name: string;
  server_url: string;
  local_ip: string;
  port: number;
  xtream_username: string;
  xtream_password: string;
  m3u_url: string;
  xmltv_url: string;
  instructions: string;
  shared_on_network?: boolean;
}
