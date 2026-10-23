import React from 'react';
import { ChannelStatus } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert, HelpCircle, Clock } from 'lucide-react';

interface VerificationBadgeProps {
  status: ChannelStatus;
  responseTimeMs?: number | null;
  reason?: string | null;
  resolution?: string | null;
  showDetails?: boolean;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  responseTimeMs,
  reason,
  resolution,
  showDetails = false
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'WORKING':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400 animate-pulse',
          icon: <CheckCircle2 className="w-3 h-3" />,
          label: 'WORKING'
        };
      case 'UNSTABLE':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-400',
          icon: <AlertTriangle className="w-3 h-3" />,
          label: 'UNSTABLE'
        };
      case 'REGION RESTRICTED':
        return {
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
          dot: 'bg-purple-400',
          icon: <ShieldAlert className="w-3 h-3" />,
          label: 'RESTRICTED'
        };
      case 'OFFLINE':
      case 'INVALID STREAM':
      case 'UNKNOWN ERROR':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-400',
          icon: <XCircle className="w-3 h-3" />,
          label: status === 'INVALID STREAM' ? 'INVALID' : 'OFFLINE'
        };
      case 'TIMEOUT':
        return {
          bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
          dot: 'bg-orange-400',
          icon: <Clock className="w-3 h-3" />,
          label: 'TIMEOUT'
        };
      case 'DRM PROTECTED':
        return {
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
          dot: 'bg-indigo-400',
          icon: <ShieldAlert className="w-3 h-3" />,
          label: 'DRM'
        };
      case 'AUTHENTICATION REQUIRED':
      case 'SUBSCRIPTION REQUIRED':
        return {
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
          dot: 'bg-blue-400',
          icon: <ShieldAlert className="w-3 h-3" />,
          label: 'AUTH REQ'
        };
      case 'UNVERIFIED':
      default:
        return {
          bg: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
          dot: 'bg-slate-400',
          icon: <HelpCircle className="w-3 h-3" />,
          label: 'UNVERIFIED'
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div className="inline-flex items-center gap-1.5" title={reason || status}>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        <span>{config.label}</span>
      </span>

      {showDetails && (
        <div className="flex items-center gap-1 text-[11px] text-nx-muted">
          {responseTimeMs ? <span>{responseTimeMs}ms</span> : null}
          {resolution ? <span className="px-1 bg-nx-card rounded border border-nx-border">{resolution}</span> : null}
        </div>
      )}
    </div>
  );
};
