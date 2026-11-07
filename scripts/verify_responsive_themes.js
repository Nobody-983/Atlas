import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/home/acknowlege/Desktop/atlas/verification_screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// 1. Get an auth token for Amara (Owner)
console.log('Obtaining authentication token from API...');
const loginRes = await fetch('http://localhost:3007/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'amara@apeximports.ng', password: 'StrongPassword123!' }),
});
const loginData = await loginRes.json();
if (!loginData.success) {
  console.error('Failed to authenticate:', loginData);
  process.exit(1);
}
const token = loginData.token;
const orgId = loginData.organisation.id;
console.log(`Authenticated as ${loginData.user.full_name} (${loginData.user.email}) for org: ${loginData.organisation.name}`);

// 2. Launch headless Chrome with remote debugging
console.log('Launching headless Chrome on port 9222...');
const chrome = spawn(
  '/usr/bin/google-chrome',
  [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=/tmp/atlas-chrome-test',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const cleanup = () => {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
  } catch (e) {}
  try {
    chrome.kill('SIGKILL');
  } catch (e) {}
};
process.on('exit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Wait for Chrome to listen
let wsDebuggerUrl = null;
for (let i = 0; i < 30; i++) {
  try {
    const verRes = await fetch('http://127.0.0.1:9222/json/version');
    if (verRes.ok) {
      const verData = await verRes.json();
      wsDebuggerUrl = verData.webSocketDebuggerUrl;
      break;
    }
  } catch (e) {}
  await new Promise((r) => setTimeout(r, 200));
}

if (!wsDebuggerUrl) {
  console.error('Failed to connect to Chrome debugging endpoint');
  process.exit(1);
}

// Create a target tab or use existing
let tabWsUrl = null;
try {
  const newTabRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:5180', { method: 'PUT' });
  const tabData = await newTabRes.json();
  tabWsUrl = tabData.webSocketDebuggerUrl;
} catch (e) {
  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await listRes.json();
  tabWsUrl = tabs[0]?.webSocketDebuggerUrl;
}
console.log('Connected to tab WebSocket:', tabWsUrl);

const ws = new WebSocket(tabWsUrl);
let seq = 0;
const pending = new Map();

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
};

await new Promise((resolve) => ws.onopen = resolve);

const cdp = (method, params = {}) => {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
};

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

// Navigate to app
console.log('Navigating to http://localhost:5180...');
await cdp('Page.navigate', { url: 'http://localhost:5180' });
await new Promise((r) => setTimeout(r, 1500));

// Inject auth token and reload
console.log('Injecting session credentials into localStorage...');
await cdp('Runtime.evaluate', {
  expression: `
    localStorage.setItem('atlas_token', '${token}');
    localStorage.setItem('atlas_active_org_id', '${orgId}');
    localStorage.setItem('atlas_theme', 'dark');
    location.reload();
  `,
});

// Wait for full dashboard hydration
console.log('Waiting for dashboard data hydration...');
await new Promise((r) => setTimeout(r, 2500));

const viewports = [
  { width: 320, name: 'iPhone SE / Small Mobile' },
  { width: 375, name: 'iPhone mini / Compact Mobile' },
  { width: 430, name: 'iPhone 15 Pro Max' },
  { width: 640, name: 'Small Tablet / Landscape' },
  { width: 768, name: 'iPad Portrait (Tablet)' },
  { width: 820, name: 'iPad Air 10.9 (Tablet)' },
  { width: 1024, name: 'iPad Landscape / Laptop' },
  { width: 1280, name: 'Standard Desktop' },
  { width: 1440, name: 'High-Res Wide Desktop' },
];

const results = [];

// Function to measure layout & overflow
async function checkLayout(width, theme, viewName = 'overview') {
  await cdp('Emulation.setDeviceMetricsOverride', {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });

  // Apply theme
  await cdp('Runtime.evaluate', {
    expression: `
      if ('${theme}' === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      localStorage.setItem('atlas_theme', '${theme}');
      window.dispatchEvent(new CustomEvent('atlas_theme_changed', { detail: { theme: '${theme}' } }));
    `,
  });

  await new Promise((r) => setTimeout(r, 120));

  // Measure metrics
  const evalResult = await cdp('Runtime.evaluate', {
    expression: `
      (() => {
        const docEl = document.documentElement;
        const body = document.body;
        const innerWidth = window.innerWidth;
        const scrollWidth = docEl.scrollWidth;
        const bodyScrollWidth = body.scrollWidth;
        const isOverflowing = scrollWidth > innerWidth + 1; // 1px threshold for subpixel rounding
        return JSON.stringify({
          innerWidth,
          scrollWidth,
          bodyScrollWidth,
          isOverflowing,
          theme: docEl.classList.contains('dark') ? 'dark' : 'light',
          dataTheme: docEl.getAttribute('data-theme'),
        });
      })()
    `,
    returnByValue: true,
  });

  const metrics = JSON.parse(evalResult.result.value);

  // Capture screenshot
  const screenshotData = await cdp('Page.captureScreenshot', { format: 'png' });
  const filename = `${theme}_${width}px_${viewName}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  fs.writeFileSync(filepath, Buffer.from(screenshotData.data, 'base64'));

  return {
    width,
    theme,
    viewName,
    ...metrics,
    screenshot: filename,
    passed: !metrics.isOverflowing,
  };
}

console.log('\n=============================================================');
console.log('RUNNING RESPONSIVE & THEME VERIFICATION ACROSS ALL 9 VIEWPORTS');
console.log('=============================================================\n');

// Test all 9 viewports in Dark Mode
console.log('--- Testing DARK Mode Across All 9 Viewports ---');
for (const vp of viewports) {
  const r = await checkLayout(vp.width, 'dark', 'dashboard');
  results.push(r);
  console.log(
    `[${r.passed ? 'PASS' : 'FAIL'}] Viewport ${vp.width}px (${vp.name}) - Dark Mode | ` +
    `window.innerWidth: ${r.innerWidth}px, scrollWidth: ${r.scrollWidth}px | Overflow: ${r.isOverflowing ? 'YES ❌' : 'NO ✅'}`
  );
}

// Test all 9 viewports in Light Mode
console.log('\n--- Testing LIGHT Mode Across All 9 Viewports ---');
for (const vp of viewports) {
  const r = await checkLayout(vp.width, 'light', 'dashboard');
  results.push(r);
  console.log(
    `[${r.passed ? 'PASS' : 'FAIL'}] Viewport ${vp.width}px (${vp.name}) - Light Mode | ` +
    `window.innerWidth: ${r.innerWidth}px, scrollWidth: ${r.scrollWidth}px | Overflow: ${r.isOverflowing ? 'YES ❌' : 'NO ✅'}`
  );
}

// Test Tablet (768px & 820px) on secondary navigation views
console.log('\n--- Testing Critical Tablet Views (768px & 820px) ---');
const tabsToTest = ['payroll', 'relay', 'invoices', 'approvals', 'proofrail'];

for (const tab of tabsToTest) {
  for (const width of [768, 820]) {
    // Click tab button
    await cdp('Runtime.evaluate', {
      expression: `
        (() => {
          const tabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.toLowerCase().includes('${tab}'));
          if (tabBtn) tabBtn.click();
        })()
      `,
    });
    await new Promise((r) => setTimeout(r, 120));

    const rDark = await checkLayout(width, 'dark', tab);
    results.push(rDark);
    console.log(
      `[${rDark.passed ? 'PASS' : 'FAIL'}] Tab: ${tab.padEnd(10)} | ${width}px Tablet (Dark) | ` +
      `scrollWidth: ${rDark.scrollWidth}px <= innerWidth: ${rDark.innerWidth}px`
    );

    const rLight = await checkLayout(width, 'light', tab);
    results.push(rLight);
    console.log(
      `[${rLight.passed ? 'PASS' : 'FAIL'}] Tab: ${tab.padEnd(10)} | ${width}px Tablet (Light) | ` +
      `scrollWidth: ${rLight.scrollWidth}px <= innerWidth: ${rLight.innerWidth}px`
    );
  }
}

// Test Auth View (Logged Out)
console.log('\n--- Testing Auth View (Light & Dark) at 375px & 768px ---');
await cdp('Runtime.evaluate', {
  expression: `
    localStorage.removeItem('atlas_token');
    localStorage.removeItem('atlas_active_org_id');
    location.reload();
  `,
});
await new Promise((r) => setTimeout(r, 1500));

for (const width of [375, 768]) {
  for (const theme of ['dark', 'light']) {
    const r = await checkLayout(width, theme, 'auth_view');
    results.push(r);
    console.log(
      `[${r.passed ? 'PASS' : 'FAIL'}] Auth View | ${width}px (${theme}) | ` +
      `scrollWidth: ${r.scrollWidth}px <= innerWidth: ${r.innerWidth}px`
    );
  }
}

// Summary Report
console.log('\n=============================================================');
console.log('RESPONSIVE & THEME VERIFICATION SUMMARY REPORT');
console.log('=============================================================');
const totalChecks = results.length;
const passedChecks = results.filter((r) => r.passed).length;
const failedChecks = totalChecks - passedChecks;

console.log(`Total Checks Executed : ${totalChecks}`);
console.log(`Passed Checks         : ${passedChecks} ✅`);
console.log(`Failed Checks         : ${failedChecks} ${failedChecks === 0 ? '' : '❌'}`);
console.log(`Screenshots Directory : ${SCREENSHOT_DIR}`);
console.log('=============================================================\n');

if (failedChecks > 0) {
  console.error('Some checks failed! See details above.');
  process.exit(1);
} else {
  console.log('All responsive layout and theme tests passed with 100% compliance! Zero horizontal page-wide scroll detected across all viewports.');
  process.exit(0);
}
