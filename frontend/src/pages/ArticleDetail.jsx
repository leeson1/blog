import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import Navbar from '../components/Navbar'
import api from '../utils/api'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr.replace(' ', 'T') + 'Z')
  return d.toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function CommentItem({ comment }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{comment.username}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(comment.created_at)}</span>
      </div>
      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{comment.content}</p>
    </div>
  )
}

function ArticleDetail() {
  const { id } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState('')

  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null

  const fetchArticle = async () => {
    try {
      const res = await api.get(`/articles/${id}`)
      setArticle(res.data)
    } catch (err) {
      setError(err.response?.status === 404 ? '文章不存在' : '加载文章失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchArticle() }, [id])

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    setCommentError('')
    setSubmitting(true)
    try {
      await api.post(`/articles/${id}/comments`, { content: comment.trim() })
      setComment('')
      await fetchArticle()
    } catch (err) {
      setCommentError(err.response?.data?.error || '评论失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-md px-4 py-3">
            {error}
            <Link to="/" className="ml-2 underline">返回列表</Link>
          </div>
        )}

        {!loading && !error && article && (
          <>
            <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">{article.title}</h1>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-3">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {article.username}
                  </span>
                  <span>·</span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(article.created_at)}
                  </span>
                </div>
              </div>
              <hr className="border-gray-200 dark:border-gray-700 mb-6" />
              <div className="markdown-body prose dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    img: ({ node, ...props }) => (
                      <img {...props} className="max-w-full rounded shadow my-4" loading="lazy" alt={props.alt || ''} />
                    ),
                  }}
                >
                  {article.content}
                </ReactMarkdown>
              </div>
            </article>

            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                评论
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({(article.comments || []).length} 条)
                </span>
              </h2>

              <div className="space-y-3 mb-6">
                {(article.comments || []).length === 0 ? (
                  <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">还没有评论，来第一个评论吧！</p>
                ) : (
                  (article.comments || []).map(comment => (
                    <CommentItem key={comment.id} comment={comment} />
                  ))
                )}
              </div>

              {user ? (
                <form onSubmit={handleSubmitComment} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">发表评论</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="写下你的想法..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
                    />
                  </div>
                  {commentError && <p className="text-red-500 dark:text-red-400 text-sm">{commentError}</p>}
                  <button
                    type="submit"
                    disabled={submitting || !comment.trim()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? '提交中...' : '发表评论'}
                  </button>
                </form>
              ) : (
                <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                  <Link to="/login" className="text-indigo-600 hover:underline">登录</Link>
                  {' '}后才能发表评论
                </div>
              )}
            </section>

            <div className="mt-4">
              <Link to="/" className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回文章列表
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ArticleDetail
