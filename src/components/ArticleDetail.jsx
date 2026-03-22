import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTheme } from '../App'

export default function ArticleDetail() {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()
  const commentsRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setContent('')
    setPost(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    fetch(import.meta.env.BASE_URL + 'posts/index.json')
      .then(r => r.json())
      .then(posts => {
        const found = posts.find(p => p.id === id)
        setPost(found || null)
      })

    fetch(import.meta.env.BASE_URL + 'docs/' + id + '.md')
      .then(r => {
        if (!r.ok) throw new Error('Not found')
        return r.text()
      })
      .then(text => {
        setContent(text)
        setLoading(false)
      })
      .catch(() => {
        setContent('')
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (!commentsRef.current || loading) return
    commentsRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://utteranc.es/client.js'
    script.setAttribute('repo', 'leeson1/blog')
    script.setAttribute('issue-term', 'title')
    script.setAttribute('theme', theme === 'dark' ? 'github-dark' : 'github-light')
    script.setAttribute('crossorigin', 'anonymous')
    script.async = true
    commentsRef.current.appendChild(script)
  }, [loading, theme, id])

  return (
    <div id="article-detail" className="visible">
      <div className="detail-wrap">
        <Link to="/articles" className="detail-back" id="detail-back">← 返回文章列表</Link>

        {post && (
          <>
            <div className="detail-tag-row">
              <span className="detail-tag" id="d-tag">{post.tag}</span>
            </div>
            <h1 className="detail-title" id="d-title">{post.title}</h1>
            <div className="detail-meta">
              <span id="d-date">{post.date}</span>
              <span id="d-time">{post.readTime} read</span>
              <span>Jason Li</span>
            </div>
          </>
        )}

        <div className="detail-body" id="d-body">
          {loading ? (
            <p style={{ color: 'var(--muted)' }}>加载中…</p>
          ) : content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          ) : (
            <p>文章加载失败，请刷新重试。</p>
          )}
        </div>

        <div className="art-comments">
          <h3 className="art-comments-title">评论</h3>
          <div id="d-comments" ref={commentsRef}></div>
        </div>

        <div className="detail-footer">
          <Link to="/articles" className="detail-footer-back" id="detail-footer-back">← 返回列表</Link>
          <div className="detail-footer-info">
            感谢阅读
            <strong>Jason Li · Blog</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
