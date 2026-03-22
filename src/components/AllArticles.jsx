import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import ArticleCard from './ArticleCard'

const TAGS = [
  { id: 'all', label: '全部' },
  { id: 'go', label: 'Go' },
  { id: 'cpp', label: 'C++' },
  { id: 'arch', label: '架构' },
  { id: 'tools', label: '工具' },
  { id: 'notes', label: '随笔' },
]

export default function AllArticles() {
  const [posts, setPosts] = useState([])
  const [activeTag, setActiveTag] = useState('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'posts/index.json')
      .then(r => r.json())
      .then(setPosts)
      .catch(() => setPosts([]))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return posts.filter(p => {
      const tagOk = activeTag === 'all' || (p.tags || []).includes(activeTag)
      const titleOk = !q || p.title.toLowerCase().includes(q)
      return tagOk && titleOk
    })
  }, [posts, activeTag, query])

  const countText = filtered.length === posts.length
    ? `共 ${posts.length} 篇`
    : `${filtered.length} / ${posts.length} 篇`

  return (
    <div id="page-articles" className="visible">
      <div className="page-articles-wrap">
        <Link to="/" className="detail-back" id="all-back">← 返回首页</Link>
        <div className="page-articles-header">
          <h2 className="sec-title">全部文章</h2>
          <span className="page-articles-total" id="all-count">{posts.length > 0 && countText}</span>
        </div>
        <div className="all-search-wrap">
          <span className="all-search-icon">⌕</span>
          <input
            className="all-search"
            id="all-search"
            type="text"
            placeholder="搜索文章标题…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="all-tag-row">
          {TAGS.map(t => (
            <button
              key={t.id}
              className={`tag${activeTag === t.id ? ' active' : ''}`}
              data-tag={t.id}
              onClick={() => setActiveTag(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="all-article-list" id="all-article-list">
          {filtered.length === 0 && posts.length > 0 ? (
            <p className="all-empty">
              {query ? `没有找到含「${query}」的文章` : '该分类下暂无文章'}
            </p>
          ) : (
            filtered.map(p => <ArticleCard key={p.id} post={p} />)
          )}
        </div>
      </div>
    </div>
  )
}
