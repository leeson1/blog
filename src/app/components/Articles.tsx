import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { Search, ArrowLeft } from "lucide-react";
import { Input } from "./ui/input";

interface Post {
  id: string;
  tag: string;
  tags: string[];
  title: string;
  date: string;
  readTime: string;
}

const TAGS = [
  { id: 'all', label: '全部' },
  { id: 'go', label: 'Go' },
  { id: 'cpp', label: 'C++' },
  { id: 'arch', label: '架构' },
  { id: 'tools', label: '工具' },
  { id: 'notes', label: '随笔' },
];

export function Articles() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTag, setActiveTag] = useState('all');

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'posts/index.json')
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
    <div id="page-articles" className="min-h-screen dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-8 py-16">
        {/* 返回按钮 */}
        <Link
          id="all-back"
          to="/"
          className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-12 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>

        {/* 标题 + 计数 + 搜索 */}
        <div className="mb-10 space-y-4">
          <div className="flex items-baseline gap-4">
            <h1 className="text-3xl text-gray-900 dark:text-gray-100">所有文章</h1>
            <span id="all-count" className="text-sm text-gray-400 dark:text-gray-500">
              {posts.length > 0 && (
                filtered.length === posts.length
                  ? `共 ${posts.length} 篇`
                  : `${filtered.length} / ${posts.length} 篇`
              )}
            </span>
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="all-search"
              type="text"
              placeholder="搜索文章标题..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 标签过滤 */}
        <div className="all-tag-row flex gap-2 flex-wrap mb-10">
          {TAGS.map(t => (
            <button
              key={t.id}
              data-tag={t.id}
              onClick={() => setActiveTag(t.id)}
              className={`tag text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeTag === t.id
                  ? 'active bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                  : 'bg-white dark:bg-transparent text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 文章列表 */}
        <div id="all-article-list" className="space-y-8">
          {filtered.length > 0 ? (
            filtered.map(post => (
              <Link
                key={post.id}
                to={`/articles/${post.id}`}
                className="block group article-card border-b border-gray-100 dark:border-gray-800 pb-8 last:border-0"
              >
                <article className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <time className="text-sm text-gray-400 dark:text-gray-500">{post.date}</time>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full">{post.tag}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{post.readTime}</span>
                  </div>
                  <h2 className="text-lg text-gray-900 dark:text-gray-100 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors leading-snug">
                    {post.title}
                  </h2>
                </article>
              </Link>
            ))
          ) : (
            <div className="all-empty text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
              {searchTerm ? `没有找到含「${searchTerm}」的文章` : '该分类下暂无文章'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
