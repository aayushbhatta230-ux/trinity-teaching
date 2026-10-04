// Shares the latest APK over the local Wi-Fi so phones and boards can download it.
//   npm run share     → open the printed link (or scan the QR code) on the phone
// The phone must be on the same Wi-Fi network as this PC. Stop with Ctrl+C.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseDir = path.join(root, 'release');
const PORT = Number(process.env.PORT) || 8080;

const apks = fs.existsSync(releaseDir)
  ? fs.readdirSync(releaseDir).filter((f) => f.endsWith('.apk'))
      .map((f) => ({ f, t: fs.statSync(path.join(releaseDir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)
  : [];
if (!apks.length) {
  console.error('No APK found in release/. Run "npm run apk" first.');
  process.exit(1);
}
const apkName = apks[0].f;
const apkPath = path.join(releaseDir, apkName);
const apkSize = fs.statSync(apkPath).size;
const version = (apkName.match(/-(\d[\w.]*)\.apk$/) || [])[1] || '';

// LAN address: prefer private Wi-Fi/Ethernet ranges.
const addrs = Object.values(os.networkInterfaces()).flat()
  .filter((a) => a && a.family === 'IPv4' && !a.internal).map((a) => a.address);
const ip = addrs.find((a) => a.startsWith('192.168.')) || addrs.find((a) => a.startsWith('10.')) || addrs[0] || 'localhost';
const pageUrl = `http://${ip}:${PORT}/`;

const mark = fs.readFileSync(path.join(root, 'src/assets/brand/trinity-logo.png')).toString('base64');
const qrSvg = await QRCode.toString(pageUrl, { type: 'svg', margin: 1, color: { dark: '#5e1a1d', light: '#ffffff' } });
const mb = (apkSize / 1048576).toFixed(1);

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Download Trinity Teaching</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#fff9f1;color:#1d1314}
  main{max-width:30rem;margin:0 auto;padding:2.5rem 1.25rem 3rem;text-align:center}
  img{height:9.5rem}
  h1{font-size:1.6rem;margin:1.5rem 0 .3rem}
  p{color:#5c4a4b;line-height:1.5;margin:.3rem 0}
  .btn{display:block;margin:1.75rem 0 1rem;padding:1.1rem;border-radius:1rem;background:#ae2f32;color:#fff;
       font-size:1.25rem;font-weight:700;text-decoration:none;border-bottom:4px solid #fab032}
  .meta{font-size:.9rem;color:#7c6a69}
  ol{text-align:left;color:#463536;line-height:1.6;padding-left:1.3rem;margin-top:1.75rem}
  .qr{margin-top:2rem;padding:1rem;background:#fff;border-radius:1rem;border:1px solid #efe2d2}
  .qr svg{width:11rem;height:11rem}
</style></head><body><main>
<img src="data:image/png;base64,${mark}" alt="Trinity International College">
<h1>Trinity Teaching</h1>
<p>Classroom presentations app for Android boards, tablets and phones.</p>
<a class="btn" href="/${encodeURIComponent(apkName)}" download>Download for Android</a>
<p class="meta">Version ${version} · ${mb} MB · Android 6.0 or newer</p>
<ol>
  <li>Tap <b>Download for Android</b>.</li>
  <li>Open the downloaded file. If asked, allow <b>Install unknown apps</b> for your browser or file manager.</li>
  <li>Tap <b>Install</b>, then open <b>Trinity Teaching</b>.</li>
</ol>
<div class="qr">${qrSvg}<p class="meta">Scan to open this page on another device</p></div>
</main></body></html>`;

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === `/${apkName}`) {
    console.log(`${new Date().toLocaleTimeString()}  download → ${req.socket.remoteAddress}`);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': apkSize,
      'Content-Disposition': `attachment; filename="${apkName}"`,
    });
    fs.createReadStream(apkPath).pipe(res);
  } else if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page);
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\nTrinity Teaching ${version} is ready to download on this Wi-Fi network:\n\n   ${pageUrl}\n`);
  console.log(await QRCode.toString(pageUrl, { type: 'terminal', small: true }));
  console.log('Open the link or scan the QR code on the phone. Press Ctrl+C to stop sharing.\n');
});
