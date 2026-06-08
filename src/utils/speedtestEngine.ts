export interface SpeedTestProgress {
  stage: 'idle' | 'ping' | 'download' | 'upload' | 'complete' | 'error';
  percent: number;
  ping: number;
  jitter: number;
  downloadSpeed: number;
  uploadSpeed: number;
  packetLoss: number;
  downloadProgress: number; // 0 to 1
  uploadProgress: number;   // 0 to 1
  activeConnections: number;
}

export interface SpeedTestResults {
  ping: number;
  jitter: number;
  downloadSpeed: number; // Mbps
  uploadSpeed: number;   // Mbps
  packetLoss: number;    // %
  duration: number;      // ms
  timestamp: string;
  downloadCurve: number[];
  uploadCurve: number[];
}

export interface SpeedTestConfig {
  pingCount?: number;
  pingTimeout?: number;
  downloadDuration?: number; // ms
  uploadDuration?: number;   // ms
  downloadStreams?: number;
  uploadStreams?: number;
  pingUrl?: string;
  downloadUrl?: string;
  uploadUrl?: string;
}

export class SpeedTestEngine {
  private config: Required<SpeedTestConfig>;
  private isRunning = false;
  private currentStage: SpeedTestProgress['stage'] = 'idle';

  // State variables
  public pingResults: number[] = [];
  public pingsFailed = 0;
  
  public downloadBytesHistory: { time: number; bytes: number }[] = [];
  public uploadBytesHistory: { time: number; bytes: number }[] = [];
  
  // Real-time speed curve capture
  public downloadCurve: number[] = [];
  public uploadCurve: number[] = [];
  
  private activeXHRs: XMLHttpRequest[] = [];
  private testStartTime = 0;

  // Callback options
  public onProgress?: (progress: SpeedTestProgress) => void;
  public onComplete?: (results: SpeedTestResults) => void;
  public onError?: (error: string) => void;

  constructor(config: SpeedTestConfig = {}) {
    this.config = {
      pingCount: config.pingCount || 15,
      pingTimeout: config.pingTimeout || 2000,
      downloadDuration: config.downloadDuration || 10000,
      uploadDuration: config.uploadDuration || 10000,
      downloadStreams: config.downloadStreams || 5,
      uploadStreams: config.uploadStreams || 4,
      pingUrl: config.pingUrl || '/api/speedtest/ping',
      downloadUrl: config.downloadUrl || '/api/speedtest/download',
      uploadUrl: config.uploadUrl || '/api/speedtest/upload',
    };
  }

  // Helper to format URLs and safely append query parameters
  private getFormattedUrl(baseUrl: string, streamIndex: number): string {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}t=${Date.now()}_${streamIndex}_${Math.random()}`;
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentStage = 'idle';
    this.activeXHRs = [];
    this.pingResults = [];
    this.pingsFailed = 0;
    this.downloadBytesHistory = [];
    this.uploadBytesHistory = [];
    this.downloadCurve = [];
    this.uploadCurve = [];
    this.testStartTime = Date.now();

    try {
      // 1. Latency (Ping) Stage
      await this.runPingStage();
      if (!this.isRunning) return;

      // 2. Download Stage
      const finalDownloadSpeed = await this.runDownloadStage();
      if (!this.isRunning) return;

      // 3. Upload Stage
      const finalUploadSpeed = await this.runUploadStage();
      if (!this.isRunning) return;

      // 4. Complete
      this.currentStage = 'complete';
      const pingsSucceeded = this.pingResults.length;
      const totalPings = pingsSucceeded + this.pingsFailed;
      const packetLoss = totalPings > 0 ? (this.pingsFailed / totalPings) * 100 : 0;

      const results: SpeedTestResults = {
        ping: this.getAveragePing(),
        jitter: this.calculateJitter(),
        downloadSpeed: finalDownloadSpeed,
        uploadSpeed: finalUploadSpeed,
        packetLoss: parseFloat(packetLoss.toFixed(1)),
        duration: Date.now() - this.testStartTime,
        timestamp: new Date().toISOString(),
        downloadCurve: this.downloadCurve,
        uploadCurve: this.uploadCurve
      };

      this.emitProgress(100, results.downloadSpeed, results.uploadSpeed, results.ping, results.jitter, results.packetLoss);
      if (this.onComplete) {
        this.onComplete(results);
      }
    } catch (err: any) {
      this.currentStage = 'error';
      if (this.onError) {
        this.onError(err.message || 'An error occurred during speed test');
      }
    } finally {
      this.stop();
    }
  }

  public stop() {
    this.isRunning = false;
    this.activeXHRs.forEach(xhr => {
      try {
        xhr.abort();
      } catch (e) {
        // ignore
      }
    });
    this.activeXHRs = [];
  }

  private emitProgress(
    percent: number,
    dlSpeed = 0,
    ulSpeed = 0,
    pingVal?: number,
    jitterVal?: number,
    lossVal?: number
  ) {
    if (!this.onProgress) return;

    const currentPing = pingVal !== undefined ? pingVal : this.getAveragePing();
    const currentJitter = jitterVal !== undefined ? jitterVal : this.calculateJitter();
    
    const pingsSucceeded = this.pingResults.length;
    const totalPings = pingsSucceeded + this.pingsFailed;
    const currentLoss = lossVal !== undefined ? lossVal : (totalPings > 0 ? (this.pingsFailed / totalPings) * 100 : 0);

    this.onProgress({
      stage: this.currentStage,
      percent: Math.min(100, Math.max(0, percent)),
      ping: Math.round(currentPing * 10) / 10,
      jitter: Math.round(currentJitter * 10) / 10,
      downloadSpeed: Math.round(dlSpeed * 100) / 100,
      uploadSpeed: Math.round(ulSpeed * 100) / 100,
      packetLoss: Math.round(currentLoss * 10) / 10,
      downloadProgress: this.currentStage === 'download' ? percent / 100 : (this.currentStage === 'upload' || this.currentStage === 'complete' ? 1 : 0),
      uploadProgress: this.currentStage === 'upload' ? percent / 100 : (this.currentStage === 'complete' ? 1 : 0),
      activeConnections: this.activeXHRs.length
    });
  }

  // --- STAGE 1: PING & JITTER ---
  private runPingStage(): Promise<void> {
    this.currentStage = 'ping';
    return new Promise<void>(async (resolve, reject) => {
      const count = this.config.pingCount;
      
      for (let i = 0; i < count; i++) {
        if (!this.isRunning) {
          reject(new Error('Test stopped by user'));
          return;
        }

        const percent = (i / count) * 100;
        this.emitProgress(percent);

        try {
          const rtt = await this.pingOnce();
          this.pingResults.push(rtt);
        } catch (e) {
          this.pingsFailed++;
        }

        await new Promise(r => setTimeout(r, 50));
      }

      this.emitProgress(100);
      resolve();
    });
  }

  private pingOnce(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = this.getFormattedUrl(this.config.pingUrl, 0);
      xhr.open('GET', url, true);
      xhr.timeout = this.config.pingTimeout;
      
      const t0 = performance.now();
      
      xhr.onload = () => {
        const t1 = performance.now();
        resolve(t1 - t0);
      };
      
      xhr.onerror = () => {
        // If this is a relative local URL or already a proxy url, don't proxy it
        if (this.config.pingUrl.startsWith('/') || this.config.pingUrl.includes('proxy-ping')) {
          reject(new Error('Network error during ping'));
          return;
        }

        // CORS / network failure: fallback to server-side proxy ping
        const proxyUrl = `/api/speedtest/proxy-ping?url=${encodeURIComponent(url)}`;
        const proxyXhr = new XMLHttpRequest();
        proxyXhr.open('GET', proxyUrl, true);
        proxyXhr.timeout = this.config.pingTimeout;
        
        proxyXhr.onload = () => {
          try {
            const data = JSON.parse(proxyXhr.responseText);
            if (data.status === 'success' && typeof data.rtt === 'number') {
              resolve(data.rtt);
            } else {
              reject(new Error(data.message || 'Proxy ping failed'));
            }
          } catch (e) {
            reject(new Error('Failed to parse proxy response'));
          }
        };
        
        proxyXhr.onerror = () => reject(new Error('Network error during proxy ping'));
        proxyXhr.ontimeout = () => reject(new Error('Proxy ping timeout'));
        proxyXhr.send();
      };
      
      xhr.ontimeout = () => reject(new Error('Ping timeout'));
      
      xhr.send();
    });
  }

  private getAveragePing(): number {
    if (this.pingResults.length === 0) return 0;
    const sum = this.pingResults.reduce((a, b) => a + b, 0);
    return sum / this.pingResults.length;
  }

  private calculateJitter(): number {
    if (this.pingResults.length < 2) return 0;
    let diffSum = 0;
    for (let i = 1; i < this.pingResults.length; i++) {
      diffSum += Math.abs(this.pingResults[i] - this.pingResults[i - 1]);
    }
    return diffSum / (this.pingResults.length - 1);
  }

  // --- STAGE 2: DOWNLOAD SPEED ---
  private runDownloadStage(): Promise<number> {
    this.currentStage = 'download';
    
    return new Promise<number>((resolve, reject) => {
      const streamsCount = this.config.downloadStreams;
      const duration = this.config.downloadDuration;
      const startTime = performance.now();
      const bytesLoadedMap = new Map<number, number>();
      
      let timer: number | null = null;
      let ended = false;
      let lastGraphSampleTime = 0;

      const cleanup = () => {
        if (timer) clearInterval(timer);
        this.activeXHRs.forEach(xhr => xhr.abort());
        this.activeXHRs = [];
      };

      const handleProgress = () => {
        if (!this.isRunning) {
          cleanup();
          reject(new Error('Test stopped by user'));
          return;
        }

        const now = performance.now();
        const elapsed = now - startTime;
        const percent = (elapsed / duration) * 100;

        let totalBytes = 0;
        bytesLoadedMap.forEach(val => {
          totalBytes += val;
        });

        this.downloadBytesHistory.push({ time: elapsed, bytes: totalBytes });
        
        const currentSpeed = this.calculateSpeedFromHistory(this.downloadBytesHistory);
        this.emitProgress(percent, currentSpeed);

        // Collect samples for Recharts area graph every 500ms
        if (elapsed - lastGraphSampleTime >= 500) {
          this.downloadCurve.push(parseFloat(currentSpeed.toFixed(2)));
          lastGraphSampleTime = elapsed;
        }

        if (elapsed >= duration) {
          ended = true;
          cleanup();
          resolve(currentSpeed);
        }
      };

      // Start the streams
      for (let i = 0; i < streamsCount; i++) {
        const xhr = new XMLHttpRequest();
        const url = this.getFormattedUrl(this.config.downloadUrl, i);
        xhr.open('GET', url, true);
        
        bytesLoadedMap.set(i, 0);

        xhr.onprogress = (e) => {
          if (ended) return;
          bytesLoadedMap.set(i, e.loaded);
        };

        xhr.onload = () => {
          if (ended) return;
          if (this.isRunning) {
            startStream(i);
          }
        };

        xhr.onerror = (err) => {
          console.error(`Download stream ${i} error`, err);
        };

        const startStream = (index: number) => {
          const indexXhr = this.activeXHRs[index];
          if (indexXhr) {
            try { indexXhr.abort(); } catch(e){}
          }
          
          const newXhr = new XMLHttpRequest();
          const newUrl = this.getFormattedUrl(this.config.downloadUrl, index);
          newXhr.open('GET', newUrl, true);
          
          const currentTotalLoadedForSlot = bytesLoadedMap.get(index) || 0;
          
          newXhr.onprogress = (e) => {
            if (ended) return;
            bytesLoadedMap.set(index, currentTotalLoadedForSlot + e.loaded);
          };
          
          newXhr.onload = () => {
            if (ended) return;
            if (this.isRunning) startStream(index);
          };
          
          newXhr.onerror = (err) => console.error(`Download stream restart ${index} error`, err);
          
          this.activeXHRs[index] = newXhr;
          newXhr.send();
        };

        this.activeXHRs.push(xhr);
        xhr.send();
      }

      timer = setInterval(handleProgress, 100) as any;
    });
  }

  // --- STAGE 3: UPLOAD SPEED ---
  private runUploadStage(): Promise<number> {
    this.currentStage = 'upload';

    const chunkSize = 256 * 1024; // 256KB chunk (reduced from 2MB for smooth progress updates without xhr.upload)
    const randomBuffer = new Uint8Array(chunkSize);
    for (let i = 0; i < chunkSize; i++) {
      randomBuffer[i] = Math.floor(Math.random() * 256);
    }
    const uploadBlob = new Blob([randomBuffer], { type: 'text/plain' });

    return new Promise<number>((resolve, reject) => {
      const streamsCount = this.config.uploadStreams;
      const duration = this.config.uploadDuration;
      const startTime = performance.now();
      const bytesUploadedMap = new Map<number, number>();
      
      let timer: number | null = null;
      let ended = false;
      let lastGraphSampleTime = 0;

      const cleanup = () => {
        if (timer) clearInterval(timer);
        this.activeXHRs.forEach(xhr => xhr.abort());
        this.activeXHRs = [];
      };

      const handleProgress = () => {
        if (!this.isRunning) {
          cleanup();
          reject(new Error('Test stopped by user'));
          return;
        }

        const now = performance.now();
        const elapsed = now - startTime;
        const percent = (elapsed / duration) * 100;

        let totalBytes = 0;
        bytesUploadedMap.forEach(val => {
          totalBytes += val;
        });

        this.uploadBytesHistory.push({ time: elapsed, bytes: totalBytes });
        
        const currentSpeed = this.calculateSpeedFromHistory(this.uploadBytesHistory);
        this.emitProgress(percent, this.getDownloadSpeed(), currentSpeed);

        // Collect samples for Recharts area graph every 500ms
        if (elapsed - lastGraphSampleTime >= 500) {
          this.uploadCurve.push(parseFloat(currentSpeed.toFixed(2)));
          lastGraphSampleTime = elapsed;
        }

        if (elapsed >= duration) {
          ended = true;
          cleanup();
          resolve(currentSpeed);
        }
      };

      for (let i = 0; i < streamsCount; i++) {
        bytesUploadedMap.set(i, 0);

        const uploadNext = (streamIndex: number, accumulatedBytes: number) => {
          if (ended || !this.isRunning) return;

          const xhr = new XMLHttpRequest();
          const url = this.getFormattedUrl(this.config.uploadUrl, streamIndex);
          xhr.open('POST', url, true);
          xhr.setRequestHeader('Content-Type', 'text/plain');
          
          // DO NOT attach event listeners to xhr.upload (e.g. xhr.upload.onprogress)
          // Doing so forces the browser to treat the request as a non-simple CORS request,
          // triggering an OPTIONS preflight which is blocked by Cloudflare Edge CDN POPs.
          
          xhr.onload = () => {
            if (ended) return;
            const nextAccumulated = accumulatedBytes + chunkSize;
            bytesUploadedMap.set(streamIndex, nextAccumulated);
            if (this.isRunning) {
              uploadNext(streamIndex, nextAccumulated);
            }
          };

          xhr.onerror = (err) => {
            console.error(`Upload stream ${streamIndex} error`, err);
            setTimeout(() => {
              if (this.isRunning && !ended) {
                uploadNext(streamIndex, bytesUploadedMap.get(streamIndex) || 0);
              }
            }, 100);
          };

          this.activeXHRs[streamIndex] = xhr;
          xhr.send(uploadBlob);
        };

        uploadNext(i, 0);
      }

      timer = setInterval(handleProgress, 100) as any;
    });
  }

  // --- STATS HELPER ---
  private calculateSpeedFromHistory(history: { time: number; bytes: number }[]): number {
    if (history.length < 2) return 0;

    const warmUpThreshold = 2000; // 2 seconds warm-up discard
    
    let startSample = history[0];
    for (const sample of history) {
      if (sample.time >= warmUpThreshold) {
        startSample = sample;
        break;
      }
    }

    const latestSample = history[history.length - 1];
    const timeDiffMs = latestSample.time - startSample.time;
    const bytesDiff = latestSample.bytes - startSample.bytes;

    if (timeDiffMs <= 0 || bytesDiff <= 0) {
      const timeTotal = latestSample.time;
      if (timeTotal <= 0) return 0;
      return (latestSample.bytes * 8) / (timeTotal / 1000) / 1000000;
    }

    const bits = bytesDiff * 8;
    const seconds = timeDiffMs / 1000;
    return bits / seconds / 1000000;
  }

  private getDownloadSpeed(): number {
    if (this.downloadBytesHistory.length === 0) return 0;
    return this.calculateSpeedFromHistory(this.downloadBytesHistory);
  }
}
