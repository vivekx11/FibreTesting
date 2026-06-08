import React, { useEffect, useState } from 'react';
import { Shield, Globe, Monitor, Wifi, MapPin } from 'lucide-react';

export interface NetworkInfo {
  ip: string;
  isp: string;
  asn: string;
  hostname: string;
  country: string;
  state: string;
  city: string;
  region: string;
  timezone: string;
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  resolution: string;
  networkType: string;
  connectionType: string;
}

interface NetworkInfoCardProps {
  onInfoFetched?: (info: NetworkInfo) => void;
}

export const NetworkInfoCard: React.FC<NetworkInfoCardProps> = ({ onInfoFetched }) => {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<NetworkInfo | null>(null);

  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        let data;
        try {
          const response = await fetch('/api/speedtest/ip');
          if (!response.ok) throw new Error('Local IP API failed');
          data = await response.json();
        } catch (localErr) {
          console.warn('Local IP API failed, attempting public GeoIP API:', localErr);
          const response = await fetch('https://ipapi.co/json/');
          if (!response.ok) throw new Error('Public GeoIP API failed');
          const geoData = await response.json();
          data = {
            ip: geoData.ip,
            isp: geoData.org || 'Unknown ISP',
            asn: geoData.asn || 'AS0',
            hostname: geoData.hostname || 'unknown.host',
            country: geoData.country_name || 'Unknown',
            state: geoData.region || 'Unknown',
            city: geoData.city || 'Unknown',
            region: geoData.region_code || 'Unknown',
            timezone: geoData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            userAgent: navigator.userAgent
          };
        }
        
        // Parse user agent
        const ua = data.userAgent || navigator.userAgent;
        const parsedUA = parseUserAgent(ua);
        
        // Network connection details if available
        const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        const connectionType = conn ? conn.effectiveType || 'Broadband' : 'Broadband';
        const networkType = conn ? conn.type || 'Ethernet/Wi-Fi' : 'Ethernet/Wi-Fi';

        const fullInfo: NetworkInfo = {
          ip: data.ip,
          isp: data.isp,
          asn: data.asn,
          hostname: data.hostname,
          country: data.country,
          state: data.state,
          city: data.city,
          region: data.region,
          timezone: data.timezone,
          userAgent: ua,
          browser: parsedUA.browser,
          os: parsedUA.os,
          device: parsedUA.device,
          resolution: `${window.screen.width} × ${window.screen.height}`,
          networkType,
          connectionType
        };

        setInfo(fullInfo);
        if (onInfoFetched) {
          onInfoFetched(fullInfo);
        }
      } catch (err) {
        console.error('Network info fetch error:', err);
        // Fallback info if offline or fetch failed
        const parsedUA = parseUserAgent(navigator.userAgent);
        const fallbackInfo: NetworkInfo = {
          ip: '127.0.0.1',
          isp: 'Local Connection',
          asn: 'AS0',
          hostname: 'localhost',
          country: 'Local Network',
          state: 'Local',
          city: 'Local',
          region: 'Local',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          userAgent: navigator.userAgent,
          browser: parsedUA.browser,
          os: parsedUA.os,
          device: parsedUA.device,
          resolution: `${window.screen.width} × ${window.screen.height}`,
          networkType: 'Ethernet/Wi-Fi',
          connectionType: 'Broadband'
        };
        setInfo(fallbackInfo);
        if (onInfoFetched) onInfoFetched(fallbackInfo);
      } finally {
        setLoading(false);
      }
    };

    fetchNetworkInfo();
  }, []);

  const parseUserAgent = (userAgent: string) => {
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    let device = 'Desktop';

    const ua = userAgent.toLowerCase();

    // OS detection
    if (ua.includes('win')) os = 'Windows';
    else if (ua.includes('mac') && !ua.includes('iphone') && !ua.includes('ipad')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
    else if (ua.includes('android')) os = 'Android';

    // Browser detection
    if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('chrome') && !ua.includes('edge') && !ua.includes('opr')) browser = 'Chrome';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edge') || ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('opr') || ua.includes('opera')) browser = 'Opera';

    // Device detection
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
      device = 'Tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua)) {
      device = 'Mobile';
    }

    return { browser, os, device };
  };

  if (loading) {
    return (
      <div className="w-full rounded-[20px] border border-border-custom bg-surface p-6 shadow-sm transition-all duration-300 animate-pulse">
        <div className="h-6 w-32 bg-border-custom rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 bg-border-custom rounded"></div>
              <div className="h-5 w-36 bg-border-custom rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="w-full rounded-[20px] border border-border-custom bg-surface p-6 shadow-sm transition-colors duration-300">
      <h3 className="text-base font-semibold text-text-primary tracking-tight mb-6 flex items-center gap-2">
        <Globe className="h-4 w-4 text-accent" />
        Connection & Network Details
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
        {/* Network & IP */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 mt-0.5 text-text-secondary" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">IP Address</p>
              <p className="text-sm font-medium text-text-primary mt-0.5 select-all">{info.ip}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">IPv4 / IPv6 Protocol</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Globe className="h-4 w-4 mt-0.5 text-text-secondary" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">ISP Name</p>
              <p className="text-sm font-medium text-text-primary mt-0.5">{info.isp}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">{info.asn}</p>
            </div>
          </div>
        </div>

        {/* Location Info */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 mt-0.5 text-text-secondary" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Location</p>
              <p className="text-sm font-medium text-text-primary mt-0.5">
                {info.city}, {info.state}
              </p>
              <p className="text-[10px] text-text-secondary mt-0.5">{info.country}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Globe className="h-4 w-4 mt-0.5 text-text-secondary" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Hostname / Zone</p>
              <p className="text-sm font-medium text-text-primary mt-0.5 break-all max-w-[180px]">
                {info.hostname}
              </p>
              <p className="text-[10px] text-text-secondary mt-0.5">{info.timezone}</p>
            </div>
          </div>
        </div>

        {/* Device & OS */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Monitor className="h-4 w-4 mt-0.5 text-text-secondary" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">System Details</p>
              <p className="text-sm font-medium text-text-primary mt-0.5">
                {info.os} ({info.device})
              </p>
              <p className="text-[10px] text-text-secondary mt-0.5">{info.browser} Browser</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Monitor className="h-4 w-4 mt-0.5 text-text-secondary" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Resolution</p>
              <p className="text-sm font-medium text-text-primary mt-0.5">{info.resolution}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">Active Display Size</p>
            </div>
          </div>
        </div>

        {/* Connection Quality */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Wifi className="h-4 w-4 mt-0.5 text-text-secondary" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Connection Type</p>
              <p className="text-sm font-medium text-text-primary mt-0.5 capitalize">{info.connectionType}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">Effective Bandwidth</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Wifi className="h-4 w-4 mt-0.5 text-text-secondary" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Network Link</p>
              <p className="text-sm font-medium text-text-primary mt-0.5 capitalize">{info.networkType}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">Interface Medium</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
