const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8787;
const ROOT = path.join(__dirname, '..');

// 简单静态文件服务器
function startServer() {
  return http.createServer((req, res) => {
    let filePath = path.join(ROOT, req.url === '/' ? '/index.html' : req.url);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  }).listen(PORT);
}

const BASE = `http://localhost:${PORT}`;

async function run() {
  const server = startServer();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const logs = [];

  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[error] ${err.message}`));

  let passed = 0, failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (e) {
      console.log(`  ❌ ${name}`);
      console.log(`     → ${e.message}`);
      failed++;
    }
  }

  async function isVisible(selector) {
    const el = await page.$(selector);
    if (!el) return false;
    return await el.isVisible();
  }

  // ── 加载页面 ──
  await page.goto(BASE, { waitUntil: 'networkidle' });
  console.log('\n=== 首页 ===');

  await test('首页加载：home section 可见', async () => {
    if (!await isVisible('#home')) throw new Error('#home 不可见');
  });

  await test('首页加载：文章列表已渲染', async () => {
    const count = await page.$$eval('#home-article-list .article-card', els => els.length);
    if (count === 0) throw new Error('文章列表为空');
  });

  await test('首页导航：nav-home 有 active 类', async () => {
    const active = await page.$eval('#nav-home', el => el.classList.contains('active'));
    if (!active) throw new Error('nav-home 没有 active');
  });

  // ── 全部文章页 ──
  console.log('\n=== 全部文章页 ===');
  await page.click('#btn-view-all');
  await page.waitForTimeout(300);

  await test('全部文章页：page-articles 可见', async () => {
    if (!await isVisible('#page-articles')) throw new Error('#page-articles 不可见');
  });

  await test('全部文章页：home section 隐藏', async () => {
    if (await isVisible('#home')) throw new Error('#home 应该隐藏');
  });

  await test('全部文章页 → 点首页：回到首页', async () => {
    await page.click('#nav-home');
    await page.waitForTimeout(300);
    if (await isVisible('#page-articles')) throw new Error('#page-articles 应该隐藏');
    if (!await isVisible('#home')) throw new Error('#home 应该可见');
  });

  await page.click('#btn-view-all');
  await page.waitForTimeout(300);

  await test('全部文章页 → 点关于我：home 可见并滚动到 about', async () => {
    await page.click('#nav-about');
    await page.waitForTimeout(500);
    if (await isVisible('#page-articles')) throw new Error('#page-articles 应该隐藏');
    if (!await isVisible('#about')) throw new Error('#about 应该可见');
  });

  await page.click('#btn-view-all');
  await page.waitForTimeout(300);

  await test('全部文章页 → 点文章：留在全部文章页', async () => {
    await page.click('#nav-articles');
    await page.waitForTimeout(300);
    if (!await isVisible('#page-articles')) throw new Error('#page-articles 应该保持可见');
  });

  // ── 文章详情页 ──
  console.log('\n=== 文章详情页 ===');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('.article-card');
  await page.waitForTimeout(500);

  await test('文章详情页：article-detail 可见', async () => {
    if (!await isVisible('#article-detail')) throw new Error('#article-detail 不可见');
  });

  await test('文章详情页 → 点首页：回到首页', async () => {
    await page.click('#nav-home');
    await page.waitForTimeout(300);
    if (await isVisible('#article-detail')) throw new Error('#article-detail 应该隐藏');
    if (!await isVisible('#home')) throw new Error('#home 应该可见');
  });

  await page.click('.article-card');
  await page.waitForTimeout(500);

  await test('文章详情页 → 点关于我：回到首页并显示 about', async () => {
    await page.click('#nav-about');
    await page.waitForTimeout(500);
    if (await isVisible('#article-detail')) throw new Error('#article-detail 应该隐藏');
    if (!await isVisible('#about')) throw new Error('#about 应该可见');
  });

  await page.click('.article-card');
  await page.waitForTimeout(500);

  await test('文章详情页 → 点返回：跳转到全部文章页', async () => {
    await page.click('#detail-back');
    await page.waitForTimeout(300);
    if (await isVisible('#article-detail')) throw new Error('#article-detail 应该隐藏');
    if (!await isVisible('#page-articles')) throw new Error('#page-articles 应该可见');
  });

  await test('文章详情页 → 点底部返回：跳转到全部文章页', async () => {
    await page.click('#all-article-list .article-card');
    await page.waitForTimeout(500);
    await page.click('#detail-footer-back');
    await page.waitForTimeout(300);
    if (await isVisible('#article-detail')) throw new Error('#article-detail 应该隐藏');
    if (!await isVisible('#page-articles')) throw new Error('#page-articles 应该可见');
  });

  // ── 汇总 ──
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`结果：${passed} 通过，${failed} 失败`);
  if (logs.length) {
    console.log('\nConsole logs:');
    logs.forEach(l => console.log(' ', l));
  }
  if (failed > 0) process.exitCode = 1;

  await browser.close();
  server.close();
}

run().catch(e => { console.error(e); process.exit(1); });
