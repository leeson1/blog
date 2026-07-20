import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { ArrowUpRight, Search } from "lucide-react";
import { SiteShell } from "./SiteShell";

interface Post {
  id: string;
  tag: string;
  tags: string[];
  title: string;
  date: string;
}

const TAGS = [
  { id: 'all', label: '全部' },
  { id: 'go', label: 'Go' },
  { id: 'cpp', label: 'C++' },
  { id: 'arch', label: '架构' },
  { id: 'shell', label: 'Shell' },
];

export function Articles() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTag, setActiveTag] = useState('all');

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'posts/index.json?t=' + Date.now())
      .then(r => r.json())
      .then(setPosts)
      .catch(() => setPosts([]));
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return posts.filter(p => {
      const tagOk = activeTag === 'all' || (p.tags || []).includes(activeTag);
      const titleOk = !q || p.title.toLowerCase().includes(q);
      return tagOk && titleOk;
    });
  }, [posts, activeTag, searchTerm]);

  return (
    <SiteShell>
      <div id="page-articles" className="site-container page-wrap">
        <header className="page-heading">
          <div>
            <p className="eyebrow">WRITING / ARCHIVE</p>
            <h1>所有文章</h1>
          </div>
          <p>关于后端架构、性能工程与开发工具的实践记录。</p>
        </header>

        <div className="archive-toolbar">
          <div className="search-field">
            <Search aria-hidden="true" />
            <input
              id="all-search"
              type="search"
              placeholder="搜索文章标题"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="搜索文章标题"
            />
          </div>

          <div className="all-tag-row" aria-label="按标签筛选">
            {TAGS.map(tag => (
              <button
                key={tag.id}
                data-tag={tag.id}
                onClick={() => setActiveTag(tag.id)}
                className={`tag ${activeTag === tag.id ? 'active' : ''}`}
                aria-pressed={activeTag === tag.id}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        <div className="archive-summary">
          <span id="all-count">
            {posts.length > 0 && (
              filtered.length === posts.length
                ? `${posts.length} 篇记录`
                : `找到 ${filtered.length} / ${posts.length} 篇`
            )}
          </span>
          <span>按时间倒序</span>
        </div>

        <div id="all-article-list" className="article-list archive-list">
          {filtered.length > 0 ? (
            filtered.map((post, index) => (
              <Link key={post.id} to={`/articles/${post.id}`} className="article-row">
                <span className="article-index">{String(index + 1).padStart(2, '0')}</span>
                <article>
                  <div className="article-meta">
                    <time>{post.date}</time>
                    <span>{post.tag}</span>
                  </div>
                  <h2>{post.title}</h2>
                </article>
                <ArrowUpRight className="article-arrow" aria-hidden="true" />
              </Link>
            ))
          ) : (
            <div className="all-empty empty-state">
              {searchTerm ? `没有找到含「${searchTerm}」的文章` : '该分类下暂无文章'}
            </div>
          )}
        </div>

        <Link id="all-back" to="/" className="text-link archive-back">
          返回首页
        </Link>
      </div>
    </SiteShell>
  );
}
