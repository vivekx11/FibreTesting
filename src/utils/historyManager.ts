export interface TestRecord {
  id: string;
  timestamp: string;
  downloadSpeed: number; // Mbps
  uploadSpeed: number;   // Mbps
  ping: number;          // ms
  jitter: number;        // ms
  packetLoss: number;    // %
  serverName: string;
  serverLocation: string;
  distance: number;      // km
  duration: number;      // ms
  ip: string;
  isp: string;
  country: string;
  city: string;
  browser: string;
  os: string;
  device: string;
}

const STORAGE_KEY = 'xspeed_test_history';

export const HistoryManager = {
  // Save a new speed test result
  saveRecord(record: Omit<TestRecord, 'id'>): TestRecord {
    const history = this.getAllRecords();
    const newRecord: TestRecord = {
      ...record,
      id: Math.random().toString(36).substring(2, 11) + '_' + Date.now()
    };
    
    history.unshift(newRecord); // Add to beginning (newest first)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return newRecord;
  },

  // Get all historical speed tests
  getAllRecords(): TestRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse history from localStorage', e);
      return [];
    }
  },

  // Delete a specific test record
  deleteRecord(id: string): void {
    const history = this.getAllRecords();
    const filtered = history.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  // Clear all history
  clearHistory(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Search and filter history
  getFilteredRecords(query: string, filterType: 'all' | 'high' | 'low' | 'recent'): TestRecord[] {
    let records = this.getAllRecords();

    // 1. Search Query filter (ISP, IP, Server Name, City, Country, OS, Browser)
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      records = records.filter(r => 
        (r.isp && r.isp.toLowerCase().includes(q)) ||
        (r.ip && r.ip.toLowerCase().includes(q)) ||
        (r.serverName && r.serverName.toLowerCase().includes(q)) ||
        (r.serverLocation && r.serverLocation.toLowerCase().includes(q)) ||
        (r.city && r.city.toLowerCase().includes(q)) ||
        (r.country && r.country.toLowerCase().includes(q)) ||
        (r.os && r.os.toLowerCase().includes(q)) ||
        (r.browser && r.browser.toLowerCase().includes(q))
      );
    }

    // 2. Class filter
    if (filterType === 'high') {
      // High speed tests (> 100 Mbps download)
      records = records.filter(r => r.downloadSpeed >= 100);
    } else if (filterType === 'low') {
      // Low speed tests (< 20 Mbps download)
      records = records.filter(r => r.downloadSpeed < 20);
    } else if (filterType === 'recent') {
      // Limit to last 10 records
      records = records.slice(0, 10);
    }

    return records;
  },

  // Get analytics data formatted for Recharts
  getAnalyticsData(): {
    weekly: any[];
    monthly: any[];
    dailyTrends: any[];
    overallStats: {
      avgDownload: number;
      avgUpload: number;
      avgPing: number;
      maxDownload: number;
      maxUpload: number;
      minPing: number;
      totalTests: number;
    };
  } {
    const records = this.getAllRecords();
    
    // Default empty analytics structure
    const emptyStats = {
      weekly: [],
      monthly: [],
      dailyTrends: [],
      overallStats: {
        avgDownload: 0,
        avgUpload: 0,
        avgPing: 0,
        maxDownload: 0,
        maxUpload: 0,
        minPing: 0,
        totalTests: 0
      }
    };

    if (records.length === 0) return emptyStats;

    // 1. Calculate overall stats
    const totalTests = records.length;
    let sumDownload = 0;
    let sumUpload = 0;
    let sumPing = 0;
    let maxDownload = 0;
    let maxUpload = 0;
    let minPing = Infinity;

    records.forEach(r => {
      sumDownload += r.downloadSpeed;
      sumUpload += r.uploadSpeed;
      sumPing += r.ping;
      if (r.downloadSpeed > maxDownload) maxDownload = r.downloadSpeed;
      if (r.uploadSpeed > maxUpload) maxUpload = r.uploadSpeed;
      if (r.ping < minPing) minPing = r.ping;
    });

    const overallStats = {
      avgDownload: parseFloat((sumDownload / totalTests).toFixed(2)),
      avgUpload: parseFloat((sumUpload / totalTests).toFixed(2)),
      avgPing: parseFloat((sumPing / totalTests).toFixed(1)),
      maxDownload: parseFloat(maxDownload.toFixed(2)),
      maxUpload: parseFloat(maxUpload.toFixed(2)),
      minPing: minPing === Infinity ? 0 : parseFloat(minPing.toFixed(1)),
      totalTests
    };

    // Helper to format Date key
    const getWeekKey = (d: Date) => {
      // Get the start of the week (Sunday)
      const day = d.getDay();
      const diff = d.getDate() - day;
      const startOfWeek = new Date(d.setDate(diff));
      return startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const getMonthKey = (d: Date) => {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    };

    // Chronological order for trend charts (oldest to newest)
    const chronoRecords = [...records].reverse();

    // Grouping by Date
    const dailyMap = new Map<string, { dl: number[]; ul: number[]; ping: number[] }>();
    const weeklyMap = new Map<string, { dl: number[]; ul: number[]; ping: number[] }>();
    const monthlyMap = new Map<string, { dl: number[]; ul: number[]; ping: number[] }>();

    chronoRecords.forEach(r => {
      const date = new Date(r.timestamp);
      
      const dayKey = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const weekKey = getWeekKey(new Date(date));
      const monthKey = getMonthKey(date);

      // Helper to aggregate
      const updateMap = (map: Map<string, any>, key: string) => {
        if (!map.has(key)) {
          map.set(key, { dl: [], ul: [], ping: [] });
        }
        const data = map.get(key);
        data.dl.push(r.downloadSpeed);
        data.ul.push(r.uploadSpeed);
        data.ping.push(r.ping);
      };

      updateMap(dailyMap, dayKey);
      updateMap(weeklyMap, weekKey);
      updateMap(monthlyMap, monthKey);
    });

    // Helper to map arrays to average statistics
    const mapToAvg = (map: Map<string, { dl: number[]; ul: number[]; ping: number[] }>) => {
      const result: any[] = [];
      map.forEach((value, key) => {
        const dlAvg = value.dl.reduce((a, b) => a + b, 0) / value.dl.length;
        const ulAvg = value.ul.reduce((a, b) => a + b, 0) / value.ul.length;
        const pingAvg = value.ping.reduce((a, b) => a + b, 0) / value.ping.length;
        result.push({
          name: key,
          download: parseFloat(dlAvg.toFixed(2)),
          upload: parseFloat(ulAvg.toFixed(2)),
          ping: parseFloat(pingAvg.toFixed(1)),
          count: value.dl.length
        });
      });
      return result;
    };

    // Recharts expects array: e.g. [{ name: 'June 1', download: 120, upload: 90, ping: 12 }]
    // For weekly, we aggregate by weeks
    // For monthly, we aggregate by months
    // Let's also provide a daily list for the recent trends
    const recentTrend = mapToAvg(dailyMap).slice(-15); // limit to last 15 active days

    return {
      weekly: mapToAvg(weeklyMap).slice(-8), // last 8 weeks
      monthly: mapToAvg(monthlyMap).slice(-12), // last 12 months
      overallStats,
      // Include the daily data in weekly as detailed trends
      dailyTrends: recentTrend
    };
  }
};
