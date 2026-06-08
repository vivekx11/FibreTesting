import React, { useRef, useState, useEffect } from 'react';
import { Download, Upload, Zap, ArrowRight, Share2, Copy, FileText, ImageIcon, Check, Globe } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { HistoryManager } from '../utils/historyManager';
import type { TestRecord } from '../utils/historyManager';

interface ResultsDashboardProps {
  results: {
    downloadSpeed: number;
    uploadSpeed: number;
    ping: number;
    jitter: number;
    packetLoss: number;
    duration: number;
    timestamp: string;
    downloadCurve?: number[];
    uploadCurve?: number[];
  };
  server: {
    name: string;
    location: string;
    distance: number;
    sponsor: string;
  };
  networkInfo?: {
    ip: string;
    isp: string;
    country: string;
    city: string;
    os: string;
    browser: string;
    device: string;
  };
  onRestart: () => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  results,
  server,
  networkInfo,
  onRestart,
}) => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [localHistory, setLocalHistory] = useState<TestRecord[]>([]);

  // Load history to show in the third row
  useEffect(() => {
    setLocalHistory(HistoryManager.getAllRecords().slice(0, 5)); // Show last 5 runs
  }, [results]);

  const formatSpeed = (val: number) => val.toFixed(1);
  
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // --- RECHARTS GRAPH DATA PROCESS ---
  const downloadCurve = results.downloadCurve || [];
  const uploadCurve = results.uploadCurve || [];
  const maxPoints = Math.max(downloadCurve.length, uploadCurve.length);
  
  const speedGraphData = Array.from({ length: maxPoints }, (_, index) => {
    const timeLabel = `${(index * 0.5).toFixed(1)}s`;
    return {
      name: timeLabel,
      Download: downloadCurve[index] !== undefined ? parseFloat(downloadCurve[index].toFixed(1)) : null,
      Upload: uploadCurve[index] !== undefined ? parseFloat(uploadCurve[index].toFixed(1)) : null,
    };
  });

  // --- SCORE CALCULATIONS ---
  const calculateScores = () => {
    const { downloadSpeed: dl, uploadSpeed: ul, ping, jitter, packetLoss: loss } = results;

    const gamingScore = Math.max(0, Math.min(100, Math.round(
      100 - (ping * 1.2) - (jitter * 2.5) - (loss * 20)
    )));

    const streamingScore = Math.max(0, Math.min(100, Math.round(
      Math.min(100, dl * 1.5) - (ping * 0.1) - (loss * 15)
    )));

    const videoCallScore = Math.max(0, Math.min(100, Math.round(
      Math.min(100, (dl * 0.4 + ul * 0.6) * 4) - (jitter * 2.0) - (loss * 25)
    )));

    const browsingScore = Math.max(0, Math.min(100, Math.round(
      Math.min(100, dl * 4) - (ping * 0.3)
    )));

    const remoteWorkScore = Math.max(0, Math.min(100, Math.round(
      Math.min(100, (dl * 0.5 + ul * 0.5) * 3) - (jitter * 1.5) - (loss * 15)
    )));

    const getRating = (score: number) => {
      if (score >= 90) return { label: 'Excellent', color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30' };
      if (score >= 75) return { label: 'Very Good', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30' };
      if (score >= 50) return { label: 'Good', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30' };
      if (score >= 30) return { label: 'Average', color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/30' };
      return { label: 'Poor', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30' };
    };

    return [
      { name: 'Gaming Performance', score: gamingScore, rating: getRating(gamingScore) },
      { name: '4K/8K Media Streaming', score: streamingScore, rating: getRating(streamingScore) },
      { name: 'HD Video Conference Call', score: videoCallScore, rating: getRating(videoCallScore) },
      { name: 'Standard Web Browsing', score: browsingScore, rating: getRating(browsingScore) },
      { name: 'Remote Office Work', score: remoteWorkScore, rating: getRating(remoteWorkScore) },
    ];
  };

  const scores = calculateScores();

  // --- ACTIONS ---
  const copyResultsText = () => {
    const summaryText = `XSpeed Test Results:
Download: ${formatSpeed(results.downloadSpeed)} Mbps
Upload: ${formatSpeed(results.uploadSpeed)} Mbps
Ping: ${results.ping.toFixed(1)} ms
Jitter: ${results.jitter.toFixed(1)} ms
Packet Loss: ${results.packetLoss}%
Server: ${server.name}
ISP: ${networkInfo?.isp || 'Unknown'}
IP: ${networkInfo?.ip || 'Unknown'}
Date: ${formatTime(results.timestamp)}`;

    navigator.clipboard.writeText(summaryText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const exportPng = async () => {
    if (!dashboardRef.current) return;
    setExportingPng(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0B0B0B' : '#F7F3EE',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `xspeed-results-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Failed to export PNG', e);
    } finally {
      setExportingPng(false);
    }
  };

  const exportPdf = () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(24);
      doc.setTextColor(26, 26, 26);
      doc.text('XSpeed Diagnostics', 20, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(130, 130, 130);
      doc.text('PREMIUM NETWORK PERFORMANCE REPORT', 20, 31);
      
      doc.setDrawColor(234, 234, 234);
      doc.line(20, 36, 190, 36);

      doc.setFontSize(10);
      doc.setTextColor(82, 82, 82);
      doc.text(`Timestamp: ${formatTime(results.timestamp)}`, 20, 45);
      doc.text(`ISP: ${networkInfo?.isp || 'Private / Local Host'}`, 20, 51);
      doc.text(`Client IP: ${networkInfo?.ip || '127.0.0.1'}`, 20, 57);
      doc.text(`Server Node: ${server.name} (${server.location})`, 20, 63);

      doc.setFillColor(247, 243, 238);
      doc.rect(20, 72, 170, 8, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(26, 26, 26);
      doc.text('Performance Metric', 24, 77);
      doc.text('Value', 120, 77);
      doc.text('Rating', 160, 77);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(82, 82, 82);
      
      const rows = [
        ['Download Rate', `${formatSpeed(results.downloadSpeed)} Mbps`, results.downloadSpeed >= 50 ? 'Excellent' : 'Good'],
        ['Upload Rate', `${formatSpeed(results.uploadSpeed)} Mbps`, results.uploadSpeed >= 25 ? 'Excellent' : 'Good'],
        ['Latency (Ping)', `${results.ping.toFixed(1)} ms`, results.ping < 25 ? 'Excellent' : 'Good'],
        ['Jitter', `${results.jitter.toFixed(1)} ms`, results.jitter < 5 ? 'Excellent' : 'Standard'],
        ['Packet Loss', `${results.packetLoss}%`, results.packetLoss === 0 ? 'Optimal' : 'Lossy'],
      ];

      let yPos = 86;
      rows.forEach(row => {
        doc.text(row[0], 24, yPos);
        doc.text(row[1], 120, yPos);
        doc.text(row[2], 160, yPos);
        doc.line(20, yPos + 3, 190, yPos + 3);
        yPos += 10;
      });

      doc.save(`xspeed-results-${Date.now()}.pdf`);
    } catch (e) {
      console.error('Failed to export PDF', e);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleShare = async () => {
    const text = `XSpeed Test completed: Download ${formatSpeed(results.downloadSpeed)} Mbps, Upload ${formatSpeed(results.uploadSpeed)} Mbps!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'XSpeed Diagnostics',
          text,
          url: window.location.origin,
        });
      } catch (e) {
        copyResultsText();
      }
    } else {
      copyResultsText();
    }
  };

  return (
    <div className="space-y-8 w-full max-w-[1440px] mx-auto animate-in fade-in duration-300">
      
      {/* Action buttons header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-custom pb-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Test Run Complete</span>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-1">SaaS Analytics Dashboard</h2>
          <p className="text-xs text-text-secondary mt-1">
            Test executed against {server.name} ({server.location}) • {server.distance} km away
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/90 text-white font-semibold text-sm rounded-[20px] shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
          >
            Start New Test
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={exportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-border-custom rounded-[20px] bg-surface text-text-secondary hover:text-text-primary hover:bg-bg/40 transition-all text-xs font-semibold"
          >
            <FileText className="h-3.5 w-3.5" />
            {exportingPdf ? 'Exporting...' : 'PDF Report'}
          </button>

          <button
            onClick={exportPng}
            disabled={exportingPng}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-border-custom rounded-[20px] bg-surface text-text-secondary hover:text-text-primary hover:bg-bg/40 transition-all text-xs font-semibold"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {exportingPng ? 'Generating...' : 'Save PNG'}
          </button>

          <button
            onClick={copyResultsText}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-border-custom rounded-[20px] bg-surface text-text-secondary hover:text-text-primary hover:bg-bg/40 transition-all text-xs font-semibold min-w-[105px] justify-center"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Summary</span>
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-border-custom rounded-[20px] bg-surface text-text-secondary hover:text-text-primary hover:bg-bg/40 transition-all text-xs font-semibold"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>
      </div>

      {/* DASHBOARD CONTAINER - Captured in PNG */}
      <div 
        ref={dashboardRef} 
        className="space-y-6 bg-transparent"
      >
        
        {/* ROW 1: 4 key metrics cards side-by-side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Download Speed Card */}
          <div className="bg-surface border border-border-custom rounded-[20px] p-6 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Download Speed</span>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/55 rounded-xl text-emerald-500">
                <Download className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6">
              <p className="text-4xl font-extrabold tracking-tight text-text-primary">
                {formatSpeed(results.downloadSpeed)}
              </p>
              <span className="text-xs font-semibold text-text-secondary mt-1 block">Megabits per second (Mbps)</span>
            </div>
          </div>

          {/* Upload Speed Card */}
          <div className="bg-surface border border-border-custom rounded-[20px] p-6 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Upload Speed</span>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200/55 rounded-xl text-blue-500">
                <Upload className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6">
              <p className="text-4xl font-extrabold tracking-tight text-text-primary">
                {formatSpeed(results.uploadSpeed)}
              </p>
              <span className="text-xs font-semibold text-text-secondary mt-1 block">Megabits per second (Mbps)</span>
            </div>
          </div>

          {/* Ping Card */}
          <div className="bg-surface border border-border-custom rounded-[20px] p-6 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Latency (Ping)</span>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/55 rounded-xl text-amber-500">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6">
              <p className="text-4xl font-extrabold tracking-tight text-text-primary">
                {Math.round(results.ping)}
              </p>
              <span className="text-xs font-semibold text-text-secondary mt-1 block">Milliseconds (ms)</span>
            </div>
          </div>

          {/* Jitter & Packet Loss Card */}
          <div className="bg-surface border border-border-custom rounded-[20px] p-6 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Stability</span>
              <div className="p-2 bg-purple-50 dark:bg-purple-950/20 border border-purple-200/55 rounded-xl text-purple-500">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2 divide-x divide-border-custom">
              <div>
                <p className="text-2xl font-bold tracking-tight text-text-primary">{results.jitter.toFixed(1)}</p>
                <span className="text-[10px] font-semibold text-text-secondary block mt-0.5">Jitter (ms)</span>
              </div>
              <div className="pl-4">
                <p className="text-2xl font-bold tracking-tight text-text-primary">{results.packetLoss}%</p>
                <span className="text-[10px] font-semibold text-text-secondary block mt-0.5">Packet Loss</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Recharts Speed Graph + Network Information */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Speed Graph (2/3 width) */}
          <div className="lg:col-span-8 bg-surface border border-border-custom rounded-[20px] p-6 shadow-sm flex flex-col justify-between hover:scale-[1.005] transition-transform duration-200">
            <div className="mb-4">
              <h3 className="text-base font-bold text-text-primary tracking-tight">Throughput Performance Graph</h3>
              <p className="text-xs text-text-secondary mt-0.5">Real-time bandwidth download and upload speed curves over the test duration.</p>
            </div>

            <div className="h-72 w-full text-xs select-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={speedGraphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.005}/>
                    </linearGradient>
                    <linearGradient id="colorUlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.005}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.3} />
                  <XAxis dataKey="name" stroke="var(--text-color-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-color-secondary)" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Speed (Mbps)', angle: -90, position: 'insideLeft', offset: 0, style: { textAnchor: 'middle', fill: 'var(--text-color-secondary)', fontSize: 10 } }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface-color)', 
                      borderColor: 'var(--border-color)', 
                      borderRadius: '12px',
                      color: 'var(--text-color-primary)',
                      fontSize: '11px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }} 
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" name="Download (Mbps)" dataKey="Download" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDlGrad)" connectNulls />
                  <Area type="monotone" name="Upload (Mbps)" dataKey="Upload" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUlGrad)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Network Info Card (1/3 width) */}
          <div className="lg:col-span-4 bg-surface border border-border-custom rounded-[20px] p-6 shadow-sm hover:scale-[1.005] transition-transform duration-200">
            <h3 className="text-base font-bold text-text-primary tracking-tight mb-5 flex items-center gap-2">
              <Globe className="h-4.5 w-4.5 text-accent" />
              Network Node Info
            </h3>
            
            <div className="space-y-4 text-xs">
              <div className="pb-3.5 border-b border-border-custom/50 flex justify-between">
                <span className="text-text-secondary font-medium">ISP</span>
                <span className="text-text-primary font-semibold text-right max-w-[180px] truncate">{networkInfo?.isp || 'Local / Private'}</span>
              </div>
              <div className="pb-3.5 border-b border-border-custom/50 flex justify-between">
                <span className="text-text-secondary font-medium">IP Address</span>
                <span className="text-text-primary font-mono font-semibold select-all">{networkInfo?.ip || '127.0.0.1'}</span>
              </div>
              <div className="pb-3.5 border-b border-border-custom/50 flex justify-between">
                <span className="text-text-secondary font-medium">Geographic Location</span>
                <span className="text-text-primary font-semibold text-right">{networkInfo ? `${networkInfo.city}, ${networkInfo.country}` : 'Loopback Network'}</span>
              </div>
              <div className="pb-3.5 border-b border-border-custom/50 flex justify-between">
                <span className="text-text-secondary font-medium">Host Agent OS</span>
                <span className="text-text-primary font-semibold">{networkInfo?.os || 'Unknown OS'}</span>
              </div>
              <div className="pb-3.5 border-b border-border-custom/50 flex justify-between">
                <span className="text-text-secondary font-medium">Browser Type</span>
                <span className="text-text-primary font-semibold">{networkInfo?.browser || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary font-medium">Device Type</span>
                <span className="text-text-primary font-semibold capitalize">{networkInfo?.device || 'Desktop'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: History Table + Quality Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* History Table (2/3 width) */}
          <div className="lg:col-span-8 bg-surface border border-border-custom rounded-[20px] p-6 shadow-sm overflow-hidden flex flex-col justify-between hover:scale-[1.005] transition-transform duration-200">
            <div>
              <h3 className="text-base font-bold text-text-primary tracking-tight">Recent Runs Logs</h3>
              <p className="text-xs text-text-secondary mt-0.5 mb-4">Quick overview of your last 5 speed test runs stored in this browser.</p>
            </div>

            {localHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-secondary">No history log records.</div>
            ) : (
              <div className="overflow-x-auto select-none">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-custom text-text-primary font-bold">
                      <th className="pb-2.5">Date / Time</th>
                      <th className="pb-2.5">Target Node</th>
                      <th className="pb-2.5">Download</th>
                      <th className="pb-2.5">Upload</th>
                      <th className="pb-2.5">Ping</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom/50">
                    {localHistory.map((item) => (
                      <tr key={item.id} className="text-text-secondary hover:text-text-primary transition-colors">
                        <td className="py-3 font-semibold">{formatTime(item.timestamp)}</td>
                        <td className="py-3 truncate max-w-[150px]">{item.serverName}</td>
                        <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">{item.downloadSpeed.toFixed(1)} Mbps</td>
                        <td className="py-3 font-bold text-blue-600 dark:text-blue-400">{item.uploadSpeed.toFixed(1)} Mbps</td>
                        <td className="py-3">{Math.round(item.ping)} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quality Analysis (1/3 width) */}
          <div className="lg:col-span-4 bg-surface border border-border-custom rounded-[20px] p-6 shadow-sm hover:scale-[1.005] transition-transform duration-200">
            <h3 className="text-base font-bold text-text-primary tracking-tight mb-4">
              Quality Assessment Index
            </h3>
            
            <div className="space-y-4">
              {scores.map((s) => (
                <div key={s.name} className="flex items-center justify-between border-b border-border-custom/40 pb-3 last:border-b-0 last:pb-0 text-xs">
                  <div>
                    <p className="font-semibold text-text-primary">{s.name}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">Overall score: {s.score}%</p>
                  </div>
                  
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.rating.color}`}>
                    {s.rating.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
