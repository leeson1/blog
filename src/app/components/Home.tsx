import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { useTheme } from "../App";

interface Post {
  id: string;
  tag: string;
  tags: string[];
  title: string;
  date: string;
  readTime: string;
}

export function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'posts/index.json')
      .then(r => r.json())
      .then(setPosts)
      .catch(() => setPosts([]));
  }, []);

  const filtered = posts.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div id="home" className="flex h-screen">
      {/* 左侧固定面板 */}
      <div className="w-2/5 bg-[#fafafa] dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center p-12 fixed left-0 top-0 h-screen overflow-y-auto">
        <div className="max-w-xs w-full space-y-8">
          {/* 头像 */}
          <div className="home-avatar">
            <img
              src={import.meta.env.BASE_URL + 'assets/avatar.jpg'}
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover"
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl tracking-tight text-gray-900 dark:text-gray-100">Jason Li</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              写 Go 和 C++ 的后端工程师，专注游戏服务器架构与视频处理管线。
            </p>
          </div>

          <nav className="space-y-1 pt-2">
            <Link
              id="nav-home"
              to="/"
              className="block text-gray-900 dark:text-gray-100 hover:text-gray-500 dark:hover:text-gray-400 transition-colors py-1.5 text-sm"
            >
              首页
            </Link>
            <Link
              id="nav-articles"
              to="/articles"
              className="block text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors py-1.5 text-sm"
            >
              文章
            </Link>
            <Link
              id="nav-about"
              to="/about"
              className="block text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors py-1.5 text-sm"
            >
              关于我
            </Link>
          </nav>

          {/* 主题切换 */}
          <button
            id="theme-toggle"
            onClick={toggleTheme}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="切换主题"
          >
            {theme === 'light' ? '🌙 深色模式' : '☀️ 浅色模式'}
          </button>
        </div>
      </div>

      {/* 右侧滚动区域 */}
      <div className="w-3/5 ml-[40%]">
        <div className="max-w-2xl mx-auto px-12 py-16">
          {/* 搜索框 */}
          <div className="relative mb-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索文章..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div id="home-article-list" className="space-y-10">
            {filtered.length > 0 ? (
              filtered.map(post => (
                <Link
                  key={post.id}
                  to={`/articles/${post.id}`}
                  className="block group article-card"
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
            ) : posts.length > 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
                没有找到相关文章
              </div>
            ) : null}
          </div>

          {posts.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span id="articles-footer-count" className="text-xs text-gray-400 dark:text-gray-500">
                共 {posts.length} 篇文章
              </span>
              <Link
                id="btn-view-all"
                to="/articles"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                查看全部文章 →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
