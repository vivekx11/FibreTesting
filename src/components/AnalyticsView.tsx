import React, { useEffect, useState } from 'react';
import { HistoryManager } from '../utils/historyManager';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { BarChart, Clock, Database, TrendingUp } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    avgDownload: 0,
    avgUpload: 0,
    avgPing: 0,
    maxDownload: 0,
    maxUpload: 0,
    minPing: 0,
    totalTests: 0
  });

  const loadAnalytics = () => {
    const analytics = HistoryManager.getAnalyticsData();
    setStats(analytics.overallStats);

    if (timeframe === 'daily') {
      setData((analytics as any).dailyTrends || []);
    } else if (timeframe === 'weekly') {
      setData(analytics.weekly || []);
    } else {
      setData(analytics.monthly || []);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  if (stats.totalTests === 0) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Analytics</span>
          <h2 className="text-xl font-bold tracking-tight text-text-primary mt-0.5">Performance Analytics</h2>
          <p className="text-xs text-text-secondary mt-1">
            Aggregated statistics and trends over time.
          </p>
        </div>
        <div className="bg-surface rounded-[20px] border border-border-custom p-12 text-center transition-colors duration-300">
          <BarChart className="h-12 w-12 text-text-secondary/35 mx-auto mb-4" />
          <p className="text-sm font-semibold text-text-primary">No data available for analytics</p>
          <p className="text-xs text-text-secondary mt-1">
            Complete at least one speed test on the Home tab to view analytics.
          </p>
        </div>
      </div>
    );
  }

  // Formatting tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border-custom p-3.5 rounded-xl shadow-md text-xs transition-colors duration-300">
          <p className="font-semibold text-text-primary mb-1.5">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} className="flex items-center gap-2 mt-1 font-medium" style={{ color: p.color }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }}></span>
              {p.name}: {p.value.toFixed(1)} {p.name.includes('Speed') || p.name.includes('download') || p.name.includes('upload') ? 'Mbps' : 'ms'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header and timeframe selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Analytics</span>
          <h2 className="text-xl font-bold tracking-tight text-text-primary mt-0.5">Performance Analytics</h2>
          <p className="text-xs text-text-secondary mt-1">
            Aggregated statistics and trends over time.
          </p>
        </div>

        {/* Segmented control for timeframe */}
        <div className="inline-flex rounded-xl bg-bg/50 border border-border-custom p-1 w-fit self-start sm:self-center transition-colors duration-300">
          {(['daily', 'weekly', 'monthly'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all duration-200 ${
                timeframe === t 
                  ? 'bg-surface text-text-primary border border-border-custom shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t === 'daily' ? 'Daily Active' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of overall statistics cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Avg Download */}
        <div className="bg-surface border border-border-custom rounded-[20px] p-5 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Avg Download</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-text-primary">{stats.avgDownload.toFixed(1)}</span>
            <span className="text-xs text-text-secondary font-medium">Mbps</span>
          </div>
          <p className="text-[10px] text-text-secondary mt-1.5">Max recorded: {stats.maxDownload.toFixed(1)} Mbps</p>
        </div>

        {/* Card 2: Avg Upload */}
        <div className="bg-surface border border-border-custom rounded-[20px] p-5 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Avg Upload</span>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-text-primary">{stats.avgUpload.toFixed(1)}</span>
            <span className="text-xs text-text-secondary font-medium">Mbps</span>
          </div>
          <p className="text-[10px] text-text-secondary mt-1.5">Max recorded: {stats.maxUpload.toFixed(1)} Mbps</p>
        </div>

        {/* Card 3: Avg Ping */}
        <div className="bg-surface border border-border-custom rounded-[20px] p-5 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Avg Ping</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-text-primary">{Math.round(stats.avgPing)}</span>
            <span className="text-xs text-text-secondary font-medium">ms</span>
          </div>
          <p className="text-[10px] text-text-secondary mt-1.5">Best ping (min): {Math.round(stats.minPing)} ms</p>
        </div>

        {/* Card 4: Total Tests */}
        <div className="bg-surface border border-border-custom rounded-[20px] p-5 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Total Tests</span>
            <Database className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-text-primary">{stats.totalTests}</span>
            <span className="text-xs text-text-secondary font-medium">runs</span>
          </div>
          <p className="text-[10px] text-text-secondary mt-1.5">Stored in LocalDatabase</p>
        </div>
      </div>

      {/* Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Bandwidth Performance Graph */}
        <div className="bg-surface border border-border-custom rounded-[20px] p-5 shadow-sm flex flex-col justify-between transition-colors duration-300">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">Bandwidth Speed Trends</h3>
            <p className="text-[11px] text-text-secondary mt-0.5">Historical comparison of download and upload rates.</p>
          </div>
          
          <div className="h-72 w-full text-xs select-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorUl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.4} />
                <XAxis dataKey="name" stroke="var(--text-color-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-color-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" name="Download Speed" dataKey="download" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorDl)" />
                <Area type="monotone" name="Upload Speed" dataKey="upload" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorUl)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Latency & Jitter Graph */}
        <div className="bg-surface border border-border-custom rounded-[20px] p-5 shadow-sm flex flex-col justify-between transition-colors duration-300">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">Latency Trends</h3>
            <p className="text-[11px] text-text-secondary mt-0.5">Historical ping latency metrics over time.</p>
          </div>
          
          <div className="h-72 w-full text-xs select-none">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.4} />
                <XAxis dataKey="name" stroke="var(--text-color-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-color-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} />
                <Line type="monotone" name="Ping (Latency)" dataKey="ping" stroke="#D4A27F" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
