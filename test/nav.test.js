const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8787;
const ROOT = path.join(__dirname, '..');

function startServer() {
  return http.createServer((req, res) => {
    let filePath = path.join(ROOT, req.url === '/' ? '/index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  }).listen(PORT);
}

const BASE = `http://localhost:${PORT}`;

async function run() {
  const server = startServer();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const consoleLogs = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleLogs.push(`[error] ${msg.text()}`); });
  page.on('pageerror', err => consoleLogs.push(`[pageerror] ${err.message}`));

  let passed = 0, failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (e) {
      console.log(`  ❌ ${name}`);
      console.log(`     → ${e.message.split('\n')[0]}`);
      const shot = path.join(__dirname, `fail_${Date.now()}.png`);
      await page.screenshot({ path: shot }).catch(() => {});
      console.log(`     截图：${shot}`);
      failed++;
    }
  }

  const $ = sel => page.$(sel);
  const isVisible = async sel => { const el = await $(sel); return el ? el.isVisible() : false; };
  const wait = ms => page.waitForTimeout(ms);
  const hasClass = async (sel, cls) => page.$eval(sel, (el, c) => el.classList.contains(c), cls);
  const getText = async sel => page.$eval(sel, el => el.textContent.trim());
  const count = async sel => (await page.$$(sel)).length;
  const countVisible = async sel => {
    const els = await page.$$(sel);
    const results = await Promise.all(els.map(el => el.isVisible()));
    return results.filter(Boolean).length;
  };
  const scroll = async y => { await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y); await wait(200); };
  const scrollTo = async sel => {
    await page.evaluate(sel => {
      const el = document.querySelector(sel);
      if (!el) return;
      // 滚到元素顶部对齐视口顶部，确保 getBoundingClientRect().top ≈ 0 < navHeight
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
      window.dispatchEvent(new Event('scroll'));
    }, sel);
    await wait(300);
  };
  const typeInto = async (sel, text) => { await page.fill(sel, text); await wait(300); };

  // ─── 加载首页 ───────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'networkidle' });
  console.log('\n=== 首页加载 ===');

  await test('home section 可见', async () => {
    if (!await isVisible('#home')) throw new Error('#home 不可见');
  });

  await test('首页文章列表渲染了 5 篇', async () => {
    const n = await countVisible('#home-article-list .article-card');
    if (n !== 5) throw new Error(`期望 5 篇，实际 ${n} 篇`);
  });

  await test('文章计数文字正确', async () => {
    const text = await getText('#articles-footer-count');
    if (!text.includes('5') || !text.includes('8')) throw new Error(`计数文字异常：${text}`);
  });

  await test('nav-home 初始有 active 类', async () => {
    if (!await hasClass('#nav-home', 'active')) throw new Error('nav-home 缺少 active');
  });

  await test('头像图片存在且可见', async () => {
    if (!await isVisible('.home-avatar img')) throw new Error('头像 img 不可见');
  });

  // ─── 首页 CTA 按钮 ───────────────────────────────────────────
  console.log('\n=== 首页 CTA 按钮 ===');

  await test('"看看我写了什么" → 滚动到文章区域', async () => {
    await scroll(0);
    await page.click('#home-cta');
    await wait(600);
    const top = await page.$eval('#articles', el => el.getBoundingClientRect().top);
    if (top > 80) throw new Error(`articles 未滚入视口，top=${top}`);
  });

  // ─── 滚动导航高亮 ────────────────────────────────────────────
  console.log('\n=== 滚动导航高亮 ===');

  await test('滚到文章区域 → nav-articles active', async () => {
    await scrollTo('#articles');
    if (!await hasClass('#nav-articles', 'active')) throw new Error('nav-articles 未高亮');
  });

  await test('滚到关于我区域 → nav-about active', async () => {
    await scrollTo('#about');
    if (!await hasClass('#nav-about', 'active')) throw new Error('nav-about 未高亮');
  });

  await test('滚回顶部 → nav-home active', async () => {
    await scroll(0);
    if (!await hasClass('#nav-home', 'active')) throw new Error('nav-home 未高亮');
  });

  // ─── 全部文章页 ──────────────────────────────────────────────
  console.log('\n=== 全部文章页 ===');

  await test('"查看全部文章" 按钮 → 打开全部文章页', async () => {
    await scroll(0);
    await page.click('#btn-view-all');
    await wait(300);
    if (!await isVisible('#page-articles')) throw new Error('#page-articles 不可见');
  });

  await test('全部文章页显示 8 篇文章', async () => {
    const n = await countVisible('#all-article-list .article-card');
    if (n !== 8) throw new Error(`期望 8 篇，实际 ${n} 篇`);
  });

  await test('文章总数显示正确', async () => {
    const text = await getText('#all-count');
    if (!text.includes('8')) throw new Error(`总数文字异常：${text}`);
  });

  await test('home section 已隐藏', async () => {
    if (await isVisible('#home')) throw new Error('#home 应隐藏');
  });

  // ─── 搜索功能 ────────────────────────────────────────────────
  console.log('\n=== 搜索功能 ===');

  await test('搜索 "Go" → 只显示含 Go 的文章', async () => {
    await typeInto('#all-search', 'Go');
    const n = await countVisible('#all-article-list .article-card');
    if (n === 0) throw new Error('搜索 Go 结果为空');
    if (n >= 8) throw new Error('搜索没有过滤效果');
  });

  await test('搜索无结果时显示空状态提示', async () => {
    await typeInto('#all-search', 'xxxxxxxxxnotexist');
    if (!await isVisible('.all-empty')) throw new Error('空状态提示不可见');
  });

  await test('清空搜索 → 恢复全部 8 篇', async () => {
    await typeInto('#all-search', '');
    const n = await countVisible('#all-article-list .article-card');
    if (n !== 8) throw new Error(`期望 8 篇，实际 ${n} 篇`);
  });

  // ─── 标签过滤 ────────────────────────────────────────────────
  console.log('\n=== 标签过滤 ===');

  await test('点击 Go 标签 → 只显示 Go 文章', async () => {
    await page.click('.all-tag-row .tag[data-tag="go"]');
    await wait(200);
    const n = await countVisible('#all-article-list .article-card');
    if (n === 0) throw new Error('Go 过滤结果为空');
    if (n >= 8) throw new Error('Go 过滤没有效果');
  });

  await test('Go 标签有 active 类', async () => {
    if (!await hasClass('.all-tag-row .tag[data-tag="go"]', 'active')) throw new Error('Go 标签缺少 active');
  });

  await test('点击 C++ 标签 → 只显示 C++ 文章', async () => {
    await page.click('.all-tag-row .tag[data-tag="cpp"]');
    await wait(200);
    const n = await countVisible('#all-article-list .article-card');
    if (n === 0) throw new Error('C++ 过滤结果为空');
    if (n >= 8) throw new Error('C++ 过滤没有效果');
  });

  await test('点击工具标签 → 只显示工具文章', async () => {
    await page.click('.all-tag-row .tag[data-tag="tools"]');
    await wait(200);
    const n = await countVisible('#all-article-list .article-card');
    if (n === 0) throw new Error('工具过滤结果为空');
  });

  await test('点击随笔标签 → 只显示随笔文章', async () => {
    await page.click('.all-tag-row .tag[data-tag="notes"]');
    await wait(200);
    const n = await countVisible('#all-article-list .article-card');
    if (n === 0) throw new Error('随笔过滤结果为空');
  });

  await test('点击架构标签 → 只显示架构文章', async () => {
    await page.click('.all-tag-row .tag[data-tag="arch"]');
    await wait(200);
    const n = await countVisible('#all-article-list .article-card');
    if (n === 0) throw new Error('架构过滤结果为空');
  });

  await test('点击全部标签 → 恢复 8 篇', async () => {
    await page.click('.all-tag-row .tag[data-tag="all"]');
    await wait(200);
    const n = await countVisible('#all-article-list .article-card');
    if (n !== 8) throw new Error(`期望 8 篇，实际 ${n} 篇`);
  });

  await test('标签 + 搜索组合过滤', async () => {
    await page.click('.all-tag-row .tag[data-tag="go"]');
    await wait(200);
    await typeInto('#all-search', 'TestMain');
    const n = await countVisible('#all-article-list .article-card');
    if (n !== 1) throw new Error(`期望 1 篇，实际 ${n} 篇`);
    // 恢复
    await typeInto('#all-search', '');
    await page.click('.all-tag-row .tag[data-tag="all"]');
    await wait(200);
  });

  // ─── 全部文章页导航 ──────────────────────────────────────────
  console.log('\n=== 全部文章页导航 ===');

  await test('全部文章页 → 点首页：回到首页顶部', async () => {
    await page.click('#nav-home');
    await wait(300);
    if (await isVisible('#page-articles')) throw new Error('#page-articles 应隐藏');
    if (!await isVisible('#home')) throw new Error('#home 应可见');
  });

  await page.click('#btn-view-all');
  await wait(300);

  await test('全部文章页 → 点关于我：显示关于我区域', async () => {
    await page.click('#nav-about');
    await wait(500);
    if (await isVisible('#page-articles')) throw new Error('#page-articles 应隐藏');
    if (!await isVisible('#about')) throw new Error('#about 应可见');
  });

  await page.click('#btn-view-all');
  await wait(300);

  await test('全部文章页 → 点文章：留在全部文章页', async () => {
    await page.click('#nav-articles');
    await wait(300);
    if (!await isVisible('#page-articles')) throw new Error('#page-articles 应保持可见');
  });

  await test('全部文章页 → "← 返回首页"：回到文章区域', async () => {
    await page.click('#all-back');
    await wait(500);
    if (await isVisible('#page-articles')) throw new Error('#page-articles 应隐藏');
    if (!await isVisible('#articles')) throw new Error('#articles 应可见');
  });

  // ─── 文章详情页 ──────────────────────────────────────────────
  console.log('\n=== 文章详情页 ===');

  await page.click('#home-article-list .article-card');
  await wait(600);

  await test('文章详情页：article-detail 可见', async () => {
    if (!await isVisible('#article-detail')) throw new Error('#article-detail 不可见');
  });

  await test('文章标题已填充', async () => {
    const title = await getText('#d-title');
    if (!title) throw new Error('标题为空');
  });

  await test('文章标签已填充', async () => {
    const tag = await getText('#d-tag');
    if (!tag) throw new Error('标签为空');
  });

  await test('文章日期已填充', async () => {
    const date = await getText('#d-date');
    if (!date) throw new Error('日期为空');
  });

  await test('文章阅读时间已填充', async () => {
    const time = await getText('#d-time');
    if (!time) throw new Error('阅读时间为空');
  });

  await test('文章正文已加载（非加载中）', async () => {
    await wait(1000);
    const body = await getText('#d-body');
    if (!body || body.includes('加载中')) throw new Error('正文未加载');
  });

  // ─── 文章详情页导航 ──────────────────────────────────────────
  console.log('\n=== 文章详情页导航 ===');

  await test('"← 返回文章列表" → 跳转到全部文章页', async () => {
    await page.click('#detail-back');
    await wait(300);
    if (await isVisible('#article-detail')) throw new Error('#article-detail 应隐藏');
    if (!await isVisible('#page-articles')) throw new Error('#page-articles 应可见');
  });

  await page.click('#all-article-list .article-card');
  await wait(600);

  await test('"← 返回列表"（底部）→ 跳转到全部文章页', async () => {
    await page.click('#detail-footer-back');
    await wait(300);
    if (await isVisible('#article-detail')) throw new Error('#article-detail 应隐藏');
    if (!await isVisible('#page-articles')) throw new Error('#page-articles 应可见');
  });

  await page.click('#all-article-list .article-card');
  await wait(600);

  await test('详情页 → 点首页：回到首页', async () => {
    await page.click('#nav-home');
    await wait(300);
    if (await isVisible('#article-detail')) throw new Error('#article-detail 应隐藏');
    if (!await isVisible('#home')) throw new Error('#home 应可见');
  });

  await page.click('#home-article-list .article-card');
  await wait(600);

  await test('详情页 → 点文章：回到文章区域', async () => {
    await page.click('#nav-articles');
    await wait(500);
    if (await isVisible('#article-detail')) throw new Error('#article-detail 应隐藏');
    if (!await isVisible('#articles')) throw new Error('#articles 应可见');
  });

  await page.click('#home-article-list .article-card');
  await wait(600);

  await test('详情页 → 点关于我：显示关于我', async () => {
    await page.click('#nav-about');
    await wait(500);
    if (await isVisible('#article-detail')) throw new Error('#article-detail 应隐藏');
    if (!await isVisible('#about')) throw new Error('#about 应可见');
  });

  // ─── 汇总 ───────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`结果：${passed} 通过，${failed} 失败`);
  if (consoleLogs.length) {
    console.log('\n页面错误：');
    consoleLogs.forEach(l => console.log(' ', l));
  }
  if (failed > 0) process.exitCode = 1;

  await browser.close();
  server.close();
}

run().catch(e => { console.error(e); process.exit(1); });
