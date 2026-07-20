import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ArrowUpRight, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteShell } from "./SiteShell";

interface Post {
  id: string;
  tag: string;
  tags: string[];
  title: string;
  date: string;
}

export function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [intro, setIntro] = useState('');
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const t = Date.now();
    fetch(import.meta.env.BASE_URL + 'posts/index.json?t=' + t)
      .then(r => r.json())
      .then(setPosts)
      .catch(() => setPosts([]));

    fetch(import.meta.env.BASE_URL + 'home/intro.md?t=' + t)
      .then(r => r.text())
      .then(setIntro)
      .catch(() => setIntro(''));
  }, []);

  const filtered = posts.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <SiteShell>
      <div id="home" className="site-container">
        <section className="home-hero">
          <p className="eyebrow">BACKEND ENGINEER · PERSONAL NOTES</p>
          <div className="home-hero-grid">
            <div>
              <h1>把复杂的系统，<br />写成清晰的笔记。</h1>
              <div className="home-intro">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{intro}</ReactMarkdown>
              </div>
              <div className="hero-actions">
                <Link id="nav-articles" to="/articles" className="text-link">
                  浏览全部文章 <ArrowUpRight aria-hidden="true" />
                </Link>
                <Link id="nav-about" to="/about" className="text-link text-link-muted">
                  了解更多
                </Link>
                <Link id="nav-home" to="/" className="sr-only">首页</Link>
              </div>
            </div>

            <aside className="profile-note" aria-label="作者简介">
              <img
                src={import.meta.env.BASE_URL + 'assets/avatar.jpg'}
                alt="Leeson 的头像"
                className="home-avatar"
              />
              <div>
                <strong>Leeson</strong>
                <span>Go / C++ 后端工程师</span>
              </div>
              <p>关注游戏服务器架构、视频处理与高性能计算。</p>
            </aside>
          </div>
        </section>

        <section className="writing-section" aria-labelledby="latest-writing">
          <div className="section-heading">
            <div>
              <p className="eyebrow">RECENT WRITING</p>
              <h2 id="latest-writing">最近更新</h2>
            </div>
            <div className="search-field compact-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                placeholder="搜索文章"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="搜索文章"
              />
            </div>
          </div>

          <div id="home-article-list" className="article-list">
            {filtered.length > 0 ? (
              filtered.map((post, index) => (
                <Link key={post.id} to={`/articles/${post.id}`} className="article-row">
                  <span className="article-index">{String(index + 1).padStart(2, '0')}</span>
                  <article>
                    <div className="article-meta">
                      <time>{post.date}</time>
                      <span>{post.tag}</span>
                    </div>
                    <h3>{post.title}</h3>
                  </article>
                  <ArrowUpRight className="article-arrow" aria-hidden="true" />
                </Link>
              ))
            ) : posts.length > 0 ? (
              <div className="empty-state">没有找到相关文章</div>
            ) : null}
          </div>

          {posts.length > 0 && (
            <div className="section-footer">
              <span id="articles-footer-count">共 {posts.length} 篇文章</span>
              <Link id="btn-view-all" to="/articles" className="text-link">
                查看全部 <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
      </div>
    </SiteShell>
  );
}
