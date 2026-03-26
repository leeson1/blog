import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "../App";

interface Post {
  id: string;
  tag: string;
  title: string;
  date: string;
  readTime: string;
}

export function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setContent('');
    setPost(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    fetch(import.meta.env.BASE_URL + 'posts/index.json')
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
    script.setAttribute('theme', theme === 'dark' ? 'github-dark' : 'github-light');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;
    commentsRef.current.appendChild(script);
  }, [loading, theme, id]);

  return (
    <div id="article-detail" className="min-h-screen bg-[#fafafa]">
      <article className="max-w-2xl mx-auto px-8 py-16">
        {/* 返回文章列表 */}
        <Link
          id="detail-back"
          to="/articles"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors mb-12 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          返回文章列表
        </Link>

        {post && (
          <header className="mb-12 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span id="d-tag" className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">{post.tag}</span>
              <time id="d-date" className="text-sm text-gray-400">{post.date}</time>
              <span id="d-time" className="text-sm text-gray-400">{post.readTime}</span>
            </div>
            <h1 id="d-title" className="text-3xl text-gray-900 leading-tight">{post.title}</h1>
          </header>
        )}

        <div id="d-body" className="md-content">
          {loading ? (
            <p className="text-gray-400 text-sm">加载中…</p>
          ) : content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          ) : (
            <p className="text-gray-400 text-sm">文章加载失败，请刷新重试。</p>
          )}
        </div>

        {!loading && (
          <>
            <div className="mt-16 pt-8 border-t border-gray-200">
              <h3 className="text-sm text-gray-500 mb-4">评论</h3>
              <div ref={commentsRef}></div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between">
              <Link
                id="detail-footer-back"
                to="/articles"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                返回列表
              </Link>
              <span className="text-xs text-gray-300">Jason Li · Blog</span>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
