from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChannelBase(BaseModel):
    name: str
    alt_names: Optional[str] = None
    country: Optional[str] = "International"
    country_code: Optional[str] = "INT"
    country_flag: Optional[str] = "🌐"
    region: Optional[str] = None
    language: Optional[str] = "English"
    category: Optional[str] = "General"
    subcategory: Optional[str] = None
    logo: Optional[str] = None
    stream_url: str
    fallback_urls: Optional[str] = "[]"
    stream_protocol: Optional[str] = "hls"
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    epg_id: Optional[str] = None
    epg_url: Optional[str] = None
    description: Optional[str] = None
    resolution: Optional[str] = None
    video_codec: Optional[str] = None
    audio_codec: Optional[str] = None
    status: Optional[str] = "UNVERIFIED"
    status_reason: Optional[str] = None
    access_restriction: Optional[str] = "PUBLIC"
    is_series: Optional[bool] = False
    is_favorite: Optional[bool] = False
    is_live: Optional[bool] = True
    is_vod: Optional[bool] = False
    is_satellite: Optional[bool] = False
    user_tags: Optional[str] = None

class ChannelCreate(ChannelBase):
    pass

class ChannelUpdate(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    category: Optional[str] = None
    logo: Optional[str] = None
    stream_url: Optional[str] = None
    is_favorite: Optional[bool] = None
    is_series: Optional[bool] = None
    is_live: Optional[bool] = None
    is_vod: Optional[bool] = None
    is_satellite: Optional[bool] = None

class Channel(ChannelBase):
    id: int
    last_checked_at: Optional[str] = None
    last_success_at: Optional[str] = None
    response_time_ms: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

class SourceCreate(BaseModel):
    name: str
    url: str
    type: str = "m3u"
    attribution: Optional[str] = None

class Source(SourceCreate):
    id: int
    enabled: bool = True
    channel_count: int = 0
    working_count: int = 0
    failed_count: int = 0
    last_refreshed_at: Optional[str] = None
    last_status: Optional[str] = None
    created_at: Optional[str] = None

class VerificationResult(BaseModel):
    channel_id: int
    status: str
    reason: Optional[str] = None
    response_time_ms: Optional[int] = None
    resolution: Optional[str] = None
    video_codec: Optional[str] = None
    audio_codec: Optional[str] = None

class VerificationStats(BaseModel):
    total_channels: int
    working: int
    unstable: int
    offline: int
    restricted: int
    unverified: int
    testing_in_progress: bool
    current_test_index: int
    total_in_queue: int

class EpgProgram(BaseModel):
    id: int
    channel_epg_id: str
    title: str
    start_time: str
    end_time: str
    description: Optional[str] = None
    category: Optional[str] = None

class XtreamAuthResponse(BaseModel):
    user_info: Dict[str, Any]
    server_info: Dict[str, Any]

class SettingsUpdate(BaseModel):
    auto_refresh_hours: Optional[int] = None
    xtream_user: Optional[str] = None
    xtream_pass: Optional[str] = None
    verification_concurrency: Optional[int] = None
