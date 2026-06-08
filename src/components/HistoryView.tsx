import React, { useEffect, useState } from 'react';
import { HistoryManager } from '../utils/historyManager';
import type { TestRecord } from '../utils/historyManager';
import { Search, Trash2, X, ArrowUpRight, ArrowDownRight, Globe } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const [records, setRecords] = useState<TestRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'high' | 'low' | 'recent'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Load history records
  const loadRecords = () => {
    const data = HistoryManager.getFilteredRecords(searchQuery, filterType);
    setRecords(data);
  };

  useEffect(() => {
    loadRecords();
  }, [searchQuery, filterType]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    HistoryManager.deleteRecord(id);
    setSelectedIds(prev => prev.filter(item => item !== id));
    loadRecords();
  };

  const handleClearAll = () => {
    HistoryManager.clearHistory();
    setSelectedIds([]);
    setConfirmClearAll(false);
    loadRecords();
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        // limit comparison to 3 records
        if (prev.length >= 3) {
          alert('You can compare a maximum of 3 test records at a time.');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.slice(0, 3).map(r => r.id));
    }
  };

  const selectedRecordsForComparison = records.filter(r => selectedIds.includes(r.id));

  // Helper calculation for comparison percentage
  const calculateDiff = (val1: number, val2: number) => {
    if (val2 === 0) return 0;
    const pct = ((val1 - val2) / val2) * 100;
    return parseFloat(pct.toFixed(1));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner and Description */}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Logs</span>
        <h2 className="text-xl font-bold tracking-tight text-text-primary mt-0.5">Test History Log</h2>
        <p className="text-xs text-text-secondary mt-1">
          Review, filter, and compare results of your historical network tests stored locally.
        </p>
      </div>

      {/* Main Actions Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-4 rounded-[20px] border border-border-custom transition-colors duration-300">
        <div className="flex flex-1 items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search by IP, ISP, country, city, server..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border-custom bg-bg/20 rounded-[20px] text-sm focus:outline-none focus:border-accent text-text-primary transition-all duration-200"
            />
          </div>

          {/* Filter dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="border border-border-custom bg-surface rounded-[20px] px-3 py-2 text-sm focus:outline-none focus:border-accent text-text-primary transition-all duration-200"
          >
            <option value="all">All Speeds</option>
            <option value="high">High Speed (&ge; 100 Mbps)</option>
            <option value="low">Low Speed (&lt; 20 Mbps)</option>
            <option value="recent">Last 10 Tests</option>
          </select>
        </div>

        {/* Global actions: Clear, Compare */}
        <div className="flex items-center gap-2">
          {selectedIds.length > 1 && (
            <button
              onClick={() => setComparing(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/90 text-white font-medium text-sm rounded-[20px] transition-all duration-200"
            >
              Compare Selected ({selectedIds.length})
            </button>
          )}

          {records.length > 0 && (
            <div>
              {confirmClearAll ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500 font-semibold">Are you sure?</span>
                  <button
                    onClick={handleClearAll}
                    className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Yes, Clear
                  </button>
                  <button
                    onClick={() => setConfirmClearAll(false)}
                    className="px-3 py-1.5 border border-border-custom text-text-secondary text-xs font-semibold rounded-lg hover:text-text-primary bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-red-200 dark:border-red-950/30 text-red-500 hover:text-white hover:bg-red-500 transition-all duration-200 text-sm font-medium rounded-[20px]"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All History
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Drawer / Modal Overlay */}
      {comparing && selectedRecordsForComparison.length > 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-surface border border-border-custom rounded-[20px] p-6 md:p-8 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setComparing(false)}
              className="absolute right-4 top-4 text-text-secondary hover:text-text-primary p-1.5 border border-border-custom rounded-lg bg-surface transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-text-primary tracking-tight mb-6">
              Test Run Comparison (Up to 3)
            </h3>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {selectedRecordsForComparison.map((r, idx) => {
                // Determine reference for comparison (comparing to the next record, or the first record as baseline)
                const baseline = selectedRecordsForComparison[idx + 1] || selectedRecordsForComparison[0];
                const isBaselineSelf = baseline.id === r.id;

                const dlDiff = isBaselineSelf ? 0 : calculateDiff(r.downloadSpeed, baseline.downloadSpeed);
                const ulDiff = isBaselineSelf ? 0 : calculateDiff(r.uploadSpeed, baseline.uploadSpeed);
                const pingDiff = isBaselineSelf ? 0 : calculateDiff(baseline.ping, r.ping); // lower is better

                return (
                  <div key={r.id} className="border border-border-custom rounded-[20px] p-5 bg-bg/25 relative flex flex-col justify-between">
                    <div className="pb-4 border-b border-border-custom mb-4">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-accent">
                        Test Run #{idx + 1}
                      </span>
                      <p className="text-xs text-text-secondary mt-1">
                        {new Date(r.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-sm font-semibold text-text-primary mt-2 flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-text-secondary" />
                        {r.isp}
                      </p>
                    </div>

                    <div className="space-y-4 flex-1">
                      {/* Download Comparison */}
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-text-secondary block">Download Rate</span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-2xl font-bold tracking-tight text-text-primary">{r.downloadSpeed.toFixed(1)}</span>
                          <span className="text-xs text-text-secondary">Mbps</span>
                        </div>
                        {!isBaselineSelf && dlDiff !== 0 && (
                          <span className={`inline-flex items-center text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded ${
                            dlDiff > 0 ? 'text-green-600 bg-green-50 dark:bg-green-950/20' : 'text-red-600 bg-red-50 dark:bg-red-950/20'
                          }`}>
                            {dlDiff > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                            {Math.abs(dlDiff)}% {dlDiff > 0 ? 'faster' : 'slower'}
                          </span>
                        )}
                      </div>

                      {/* Upload Comparison */}
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-text-secondary block">Upload Rate</span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-2xl font-bold tracking-tight text-text-primary">{r.uploadSpeed.toFixed(1)}</span>
                          <span className="text-xs text-text-secondary">Mbps</span>
                        </div>
                        {!isBaselineSelf && ulDiff !== 0 && (
                          <span className={`inline-flex items-center text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded ${
                            ulDiff > 0 ? 'text-green-600 bg-green-50 dark:bg-green-950/20' : 'text-red-600 bg-red-50 dark:bg-red-950/20'
                          }`}>
                            {ulDiff > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                            {Math.abs(ulDiff)}% {ulDiff > 0 ? 'faster' : 'slower'}
                          </span>
                        )}
                      </div>

                      {/* Ping Comparison */}
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-text-secondary block">Ping (Latency)</span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-2xl font-bold tracking-tight text-text-primary">{Math.round(r.ping)}</span>
                          <span className="text-xs text-text-secondary">ms</span>
                        </div>
                        {!isBaselineSelf && pingDiff !== 0 && (
                          <span className={`inline-flex items-center text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded ${
                            pingDiff > 0 ? 'text-green-600 bg-green-50 dark:bg-green-950/20' : 'text-red-600 bg-red-50 dark:bg-red-950/20'
                          }`}>
                            {pingDiff > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                            {Math.abs(pingDiff)}% {pingDiff > 0 ? 'better latency' : 'worse latency'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* History Log Table */}
      <div className="bg-surface rounded-[20px] border border-border-custom overflow-hidden transition-colors duration-300">
        {records.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-sm font-semibold text-text-primary">No speed test records found</p>
            <p className="text-xs text-text-secondary mt-1">
              Run some speed tests on the Home tab to build up your history log.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-text-secondary">
              <thead className="bg-bg/40 border-b border-border-custom text-text-primary text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === records.length && records.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border-custom bg-surface text-accent focus:ring-accent cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">ISP / Network</th>
                  <th className="py-3 px-4">Download</th>
                  <th className="py-3 px-4">Upload</th>
                  <th className="py-3 px-4">Ping</th>
                  <th className="py-3 px-4">Jitter / Loss</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/60">
                {records.map((r) => {
                  const isChecked = selectedIds.includes(r.id);
                  return (
                    <tr 
                      key={r.id} 
                      onClick={() => handleSelect(r.id)}
                      className={`hover:bg-bg/20 cursor-pointer transition-colors duration-150 ${
                        isChecked ? 'bg-bg/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelect(r.id)}
                          className="rounded border-border-custom bg-surface text-accent focus:ring-accent cursor-pointer"
                        />
                      </td>

                      {/* Date/Time */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-text-primary">{new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                        <p className="text-[10px] text-text-secondary">{new Date(r.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>

                      {/* ISP / Server */}
                      <td className="py-3.5 px-4 max-w-[200px] truncate">
                        <p className="font-medium text-text-primary">{r.isp}</p>
                        <p className="text-[10px] text-text-secondary">{r.serverName} ({r.serverLocation})</p>
                      </td>

                      {/* Download */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{r.downloadSpeed.toFixed(1)}</span>
                        <span className="text-[10px] text-text-secondary ml-0.5">Mbps</span>
                      </td>

                      {/* Upload */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-blue-600 dark:text-blue-400">{r.uploadSpeed.toFixed(1)}</span>
                        <span className="text-[10px] text-text-secondary ml-0.5">Mbps</span>
                      </td>

                      {/* Ping */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-text-primary">{Math.round(r.ping)}</span>
                        <span className="text-[10px] text-text-secondary ml-0.5">ms</span>
                      </td>

                      {/* Jitter / Loss */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-text-primary">{r.jitter.toFixed(1)}<span className="text-[10px] text-text-secondary ml-0.5">ms jitter</span></p>
                        <p className="text-[10px] text-red-500 font-semibold">{r.packetLoss > 0 ? `${r.packetLoss}% loss` : '0% loss'}</p>
                      </td>

                      {/* Delete */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleDelete(r.id, e)}
                          className="p-1.5 text-text-secondary hover:text-red-500 border border-transparent hover:border-red-200 dark:hover:border-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-lg transition-all"
                          title="Delete test record"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
