import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/atom-one-dark.css";
import { SiteShell } from "./SiteShell";

interface Post {
  id: string;
  tag: string;
  title: string;
  date: string;
}

function CodeBlock({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = ref.current?.innerText ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="code-block-wrapper">
      <pre ref={ref} {...props}>{children}</pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="复制代码"
        className="code-copy-btn"
      >
        {copied ? '已复制' : '复制'}
      </button>
    </div>
  );
}

export function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const commentsRef = useRef<HTMLDivElement>(null);

  const wordCount = useMemo(() => {
    if (!content) return 0;
    const stripped = content
      .replace(/```[\s\S]*?```/g, '')   // 去掉代码块
      .replace(/`[^`]*`/g, '')          // 去掉行内代码
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')  // 去掉图片
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'); // 链接保留文字
    const chinese = (stripped.match(/[一-鿿]/g) || []).length;
    const english = (stripped.match(/[a-zA-Z0-9]+/g) || []).length;
    return chinese + english;
  }, [content]);

  useEffect(() => {
    setLoading(true);
    setContent('');
    setPost(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    fetch(import.meta.env.BASE_URL + 'posts/index.json?t=' + Date.now())
      .then(r => r.json())
      .then((posts: Post[]) => {
        const found = posts.find(p => p.id === id);
        setPost(found || null);
      });

    fetch(import.meta.env.BASE_URL + 'docs/' + id + '.md')
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.text();
      })
      .then(text => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setContent('');
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!commentsRef.current || loading) return;
    commentsRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://utteranc.es/client.js';
    script.setAttribute('repo', 'leeson1/blog');
    script.setAttribute('issue-term', 'title');
    script.setAttribute('theme', 'github-light');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;
    commentsRef.current.appendChild(script);
  }, [loading, id]);

  return (
    <SiteShell>
      <article id="article-detail" className="article-page">
        <Link id="detail-back" to="/articles" className="back-link">
          <ArrowLeft aria-hidden="true" />
          所有文章
        </Link>

        {post && (
          <header className="article-header">
            <div className="article-header-meta">
              <span id="d-tag">{post.tag}</span>
              <time id="d-date">{post.date}</time>
            </div>
            <h1 id="d-title">{post.title}</h1>
            <div className="article-header-rule" />
          </header>
        )}

        <div id="d-body" className="md-content">
          {loading ? (
            <p className="loading-copy">正在整理文字…</p>
          ) : content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSlug, rehypeHighlight]}
              components={{
                pre: CodeBlock,
                a: ({ href, children, ...props }) => {
                  if (href && href.startsWith('#')) {
                    return (
                      <a
                        href={href}
                        onClick={(e) => {
                          e.preventDefault();
                          const id = decodeURIComponent(href.slice(1));
                          const el = document.getElementById(id);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  }
                  return <a href={href} {...props}>{children}</a>;
                },
              }}
            >{content}</ReactMarkdown>
          ) : (
            <p className="loading-copy">文章加载失败，请刷新重试。</p>
          )}
        </div>

        {!loading && content && (
          <div className="article-word-count">
            全文约 {wordCount.toLocaleString()} 字
          </div>
        )}

        {!loading && (
          <>
            <section className="comments-section">
              <p className="eyebrow">DISCUSSION</p>
              <h2>评论</h2>
              <div ref={commentsRef}></div>
            </section>

            <div className="article-footer">
              <Link
                id="detail-footer-back"
                to="/articles"
                className="back-link"
              >
                <ArrowLeft aria-hidden="true" />
                返回列表
              </Link>
              <span>Leeson / Notes</span>
            </div>
          </>
        )}
      </article>
    </SiteShell>
  );
}
