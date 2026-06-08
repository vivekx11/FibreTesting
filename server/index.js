import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dns from 'dns';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Helper to determine if an IP is private/local
function isLocalIp(ip) {
  if (!ip) return true;
  const ipv4Pattern = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[1-2])\.|192\.168\.)/;
  const ipv6Pattern = /^(::1|fe80:|fc00:|fd00:)/i;
  
  // Strip IPv6-mapped IPv4 prefix if present
  let cleanIp = ip;
  if (ip.startsWith('::ffff:')) {
    cleanIp = ip.slice(7);
  }
  
  return ipv4Pattern.test(cleanIp) || ipv6Pattern.test(cleanIp) || cleanIp === 'localhost';
}

// 1. Latency (Ping) endpoint
app.get('/api/speedtest/ping', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.status(204).end();
});

// 1.1 CORS-Safe Proxy Ping endpoint
app.get('/api/speedtest/proxy-ping', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ status: 'error', message: 'Missing URL parameter' });
  }

  const t0 = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 
        'Cache-Control': 'no-cache',
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0'
      }
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status < 400) {
      const t1 = performance.now();
      return res.json({ status: 'success', rtt: t1 - t0 });
    } else {
      throw new Error(`Server returned status ${response.status}`);
    }
  } catch (err) {
    return res.json({ status: 'error', message: err.message || 'Ping failed' });
  }
});

// 2. Download endpoint - streams garbage data
app.get('/api/speedtest/download', (req, res) => {
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Stream size up to 1GB if requested, default to 100MB
  const size = parseInt(req.query.size, 10) || 100 * 1024 * 1024;
  
  // Allocate a single 64KB buffer of zero bytes to write repeatedly
  const buffer = Buffer.alloc(64 * 1024);
  let bytesSent = 0;

  function write() {
    let ok = true;
    while (bytesSent < size && ok) {
      const remaining = size - bytesSent;
      const chunkSize = Math.min(buffer.length, remaining);
      const chunk = chunkSize === buffer.length ? buffer : buffer.subarray(0, chunkSize);
      ok = res.write(chunk);
      bytesSent += chunkSize;
    }
    if (bytesSent >= size) {
      res.end();
    }
  }

  res.on('drain', write);
  write();
});

// 3. Upload endpoint - discards incoming POST body
app.post('/api/speedtest/upload', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  
  let bytesReceived = 0;

  req.on('data', (chunk) => {
    bytesReceived += chunk.length;
  });

  req.on('end', () => {
    res.status(200).json({
      status: 'success',
      bytesReceived
    });
  });
});

// 4. IP and GeoIP information lookup endpoint
app.get('/api/speedtest/ip', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  // Try to find the client IP
  let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  if (Array.isArray(clientIp)) {
    clientIp = clientIp[0];
  }
  if (clientIp.includes(',')) {
    clientIp = clientIp.split(',')[0].trim();
  }

  // Strip IPv6 transition prefix if present
  let displayIp = clientIp;
  if (clientIp.startsWith('::ffff:')) {
    displayIp = clientIp.slice(7);
  }

  const isLocal = isLocalIp(displayIp);
  let geoData = null;

  try {
    // If client IP is local/loopback, query GeoIP details using the server's external IP
    // otherwise query using the client's public IP.
    const queryUrl = isLocal 
      ? 'https://ipapi.co/json/' 
      : `https://ipapi.co/${displayIp}/json/`;

    const response = await fetch(queryUrl);
    if (response.ok) {
      const data = await response.json();
      geoData = {
        ip: data.ip || displayIp,
        isp: data.org || 'Local Network',
        asn: data.asn || 'AS0',
        hostname: data.hostname || 'localhost',
        country: data.country_name || 'Local',
        state: data.region || 'Local',
        city: data.city || 'Local',
        region: data.region_code || 'Local',
        timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        latitude: data.latitude,
        longitude: data.longitude
      };
    }
  } catch (error) {
    console.error('GeoIP lookup failed:', error.message);
  }

  // Fallback if geoip service is down or failed
  if (!geoData) {
    geoData = {
      ip: displayIp,
      isp: isLocal ? 'Localhost Provider' : 'Unknown ISP',
      asn: 'AS0',
      hostname: 'unknown.host',
      country: 'Unknown',
      state: 'Unknown',
      city: 'Unknown',
      region: 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  // Add system details from request headers
  const userAgent = req.headers['user-agent'] || '';
  
  res.json({
    ip: geoData.ip,
    isp: geoData.isp,
    asn: geoData.asn,
    hostname: geoData.hostname,
    country: geoData.country,
    state: geoData.state,
    city: geoData.city,
    region: geoData.region,
    timezone: geoData.timezone,
    latitude: geoData.latitude,
    longitude: geoData.longitude,
    userAgent
  });
});

// 5. Servers list endpoint
app.get('/api/speedtest/servers', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  // Return list of test servers. Official CORS-enabled Cloudflare CDN POPs
  // are configured to allow accurate internet speed tests without CORS failures.
  res.json([
    {
      id: 'cloudflare-nearest',
      name: 'Automatic Nearest (Cloudflare Edge CDN)',
      location: 'Global CDN Network',
      pingUrl: 'https://speed.cloudflare.com/__down?bytes=0',
      downloadUrl: 'https://speed.cloudflare.com/__down?bytes=150000000',
      uploadUrl: 'https://speed.cloudflare.com/__up',
      distance: 10,
      sponsor: 'Cloudflare Edge',
      isExternal: true
    },
    {
      id: 'cloudflare-us',
      name: 'North America Server (Cloudflare US)',
      location: 'New York, USA',
      pingUrl: 'https://speed.cloudflare.com/__down?bytes=0',
      downloadUrl: 'https://speed.cloudflare.com/__down?bytes=150000000',
      uploadUrl: 'https://speed.cloudflare.com/__up',
      distance: 1500,
      sponsor: 'Cloudflare NY',
      isExternal: true
    },
    {
      id: 'cloudflare-eu',
      name: 'Europe Central Server (Cloudflare EU)',
      location: 'Frankfurt, Germany',
      pingUrl: 'https://speed.cloudflare.com/__down?bytes=0',
      downloadUrl: 'https://speed.cloudflare.com/__down?bytes=150000000',
      uploadUrl: 'https://speed.cloudflare.com/__up',
      distance: 6200,
      sponsor: 'Cloudflare Frankfurt',
      isExternal: true
    },
    {
      id: 'cloudflare-ap',
      name: 'Asia Pacific Server (Cloudflare AP)',
      location: 'Singapore',
      pingUrl: 'https://speed.cloudflare.com/__down?bytes=0',
      downloadUrl: 'https://speed.cloudflare.com/__down?bytes=150000000',
      uploadUrl: 'https://speed.cloudflare.com/__up',
      distance: 14000,
      sponsor: 'Cloudflare Singapore',
      isExternal: true
    },
    {
      id: 'local',
      name: 'Local Host Interface (Internal Loopback)',
      location: 'Loopback Interface',
      pingUrl: '/api/speedtest/ping',
      downloadUrl: '/api/speedtest/download?size=200000000',
      uploadUrl: '/api/speedtest/upload',
      distance: 0,
      sponsor: 'Local Host',
      isExternal: false
    }
  ]);
});

app.listen(PORT, () => {
  console.log(`Speedtest backend running on port ${PORT}`);
});
