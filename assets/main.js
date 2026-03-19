(function () {
  'use strict';

  const RECENT_COUNT = 5;
  let allPosts = [];
  let allActiveTag = 'all';
  const mainSections = ['home', 'articles', 'about'];

  const $ = id => document.getElementById(id);

  async function init() {
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    $('today-day').textContent = days[new Date().getDay()];

    try {
      const res = await fetch('./posts/index.json');
      allPosts = await res.json();
    } catch (e) {
      console.error('Failed to load posts:', e);
      allPosts = [];
    }

    renderHomeArticles();
    renderAllArticles();
    setupHandlers();
  }

  function renderHomeArticles() {
    const container = $('home-article-list');
    container.innerHTML = allPosts.slice(0, RECENT_COUNT).map(p => articleCardHTML(p)).join('');
    const counter = $('articles-footer-count');
    if (counter) counter.textContent = `显示最近 ${RECENT_COUNT} 篇 · 共 ${allPosts.length} 篇`;
    attachCardClicks(container);
  }

  function renderAllArticles() {
    const container = $('all-article-list');
    container.innerHTML = allPosts.map(p => articleCardHTML(p, true)).join('');
    attachCardClicks(container);
    updateAllCount();
  }

  function articleCardHTML(p, withTags) {
    const tagsAttr = withTags && p.tags ? `data-tags="${p.tags.join(' ')}"` : '';
    return `<a href="#" class="article-card" data-id="${p.id}" ${tagsAttr}>
      <div class="article-body">
        <div class="article-title">${p.title}</div>
        <div class="article-meta"><span class="article-meta-tag">${p.tag}</span><span>${p.date}</span><span>${p.readTime}</span></div>
      </div>
      <span class="article-arrow">→</span>
    </a>`;
  }

  function attachCardClicks(container) {
    container.querySelectorAll('.article-card').forEach(card => {
      card.addEventListener('click', e => {
        e.preventDefault();
        openArticle(card.dataset.id);
      });
    });
  }

  async function openArticle(id) {
    const post = allPosts.find(p => p.id === id);
    if (!post) return;

    $('d-tag').textContent = post.tag;
    $('d-title').textContent = post.title;
    $('d-date').textContent = post.date;
    $('d-time').textContent = post.readTime + ' read';
    $('d-body').innerHTML = '<p style="color:var(--muted)">加载中…</p>';

    showDetail();

    try {
      const res = await fetch('./posts/' + id + '.html');
      $('d-body').innerHTML = await res.text();
    } catch (e) {
      $('d-body').innerHTML = '<p>文章加载失败，请刷新重试。</p>';
    }

    // Reload utterances
    const commentsEl = $('d-comments');
    commentsEl.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://utteranc.es/client.js';
    script.setAttribute('repo', 'leeson1/blog');
    script.setAttribute('issue-term', 'title');
    script.setAttribute('theme', 'github-light');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;
    commentsEl.appendChild(script);
  }

  function showDetail() {
    mainSections.forEach(s => { const el = $(s); if (el) el.style.display = 'none'; });
    $('page-articles').classList.remove('visible');
    document.querySelector('footer').style.display = 'none';
    $('article-detail').classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeDetail() {
    $('article-detail').classList.remove('visible');
    mainSections.forEach(s => { const el = $(s); if (el) el.style.display = ''; });
    document.querySelector('footer').style.display = '';
  }

  function openAllArticles() {
    mainSections.forEach(s => { const el = $(s); if (el) el.style.display = 'none'; });
    document.querySelector('footer').style.display = 'none';
    $('page-articles').classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateAllCount();
  }

  function closeAllArticles() {
    $('page-articles').classList.remove('visible');
    mainSections.forEach(s => { const el = $(s); if (el) el.style.display = ''; });
    document.querySelector('footer').style.display = '';
    $('all-search').value = '';
    allActiveTag = 'all';
    document.querySelectorAll('.all-tag-row .tag').forEach(t => {
      t.classList.toggle('active', t.dataset.tag === 'all');
    });
    filterAll();
    setTimeout(() => $('articles').scrollIntoView({ behavior: 'smooth' }), 50);
  }

  function updateAllCount() {
    const cards = document.querySelectorAll('#all-article-list .article-card');
    const visible = [...cards].filter(c => c.style.display !== 'none').length;
    const el = $('all-count');
    if (el) el.textContent = visible === cards.length ? `共 ${cards.length} 篇` : `${visible} / ${cards.length} 篇`;
  }

  function filterAll() {
    const q = ($('all-search') ? $('all-search').value : '').trim().toLowerCase();
    document.querySelectorAll('#all-article-list .article-card').forEach(c => {
      const tagOk = allActiveTag === 'all' || (c.dataset.tags || '').includes(allActiveTag);
      const titleOk = !q || c.querySelector('.article-title').textContent.toLowerCase().includes(q);
      c.style.display = (tagOk && titleOk) ? '' : 'none';
    });
    updateAllCount();
    const list = $('all-article-list');
    let empty = list.querySelector('.all-empty');
    const hasVisible = [...list.querySelectorAll('.article-card')].some(c => c.style.display !== 'none');
    if (!hasVisible) {
      if (!empty) { empty = document.createElement('p'); empty.className = 'all-empty'; list.appendChild(empty); }
      empty.textContent = q ? `没有找到含「${q}」的文章` : '该分类下暂无文章';
    } else if (empty) {
      empty.remove();
    }
  }

  function setupHandlers() {
    // Nav logo & home link
    ['nav-logo', 'nav-home'].forEach(id => {
      $(id) && $(id).addEventListener('click', e => {
        if ($('article-detail').classList.contains('visible')) { e.preventDefault(); closeDetail(); }
      });
    });
    $('nav-articles') && $('nav-articles').addEventListener('click', e => {
      if ($('article-detail').classList.contains('visible')) {
        e.preventDefault(); closeDetail();
        setTimeout(() => $('articles').scrollIntoView({ behavior: 'smooth' }), 50);
      }
    });
    $('nav-about') && $('nav-about').addEventListener('click', e => {
      if ($('article-detail').classList.contains('visible')) {
        e.preventDefault(); closeDetail();
        setTimeout(() => $('about').scrollIntoView({ behavior: 'smooth' }), 50);
      }
    });

    $('btn-view-all') && $('btn-view-all').addEventListener('click', openAllArticles);
    $('all-back') && $('all-back').addEventListener('click', closeAllArticles);
    $('detail-back') && $('detail-back').addEventListener('click', closeDetail);
    $('detail-footer-back') && $('detail-footer-back').addEventListener('click', closeDetail);

    $('home-cta') && $('home-cta').addEventListener('click', e => {
      e.preventDefault();
      $('articles').scrollIntoView({ behavior: 'smooth' });
    });

    $('all-search') && $('all-search').addEventListener('input', filterAll);

    document.querySelectorAll('.all-tag-row .tag').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.all-tag-row .tag').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        allActiveTag = btn.dataset.tag;
        filterAll();
      });
    });
  }

  init();
})();
