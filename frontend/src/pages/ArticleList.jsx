import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../utils/api'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr.replace(' ', 'T') + 'Z')
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

function ArticleCard({ article }) {
  return (
    <Link
      to={`/articles/${article.id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500 transition-all duration-200"
    >
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
        {article.title}
      </h2>
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
    </Link>
  )
}

function ArticleList() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await api.get('/articles')
        setArticles(res.data)
      } catch (err) {
        setError('加载文章列表失败')
      } finally {
        setLoading(false)
      }
    }
    fetchArticles()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-end mb-6">
          <span className="text-sm text-gray-500 dark:text-gray-400">共 {articles.length} 篇文章</span>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-md px-4 py-3">
            {error}
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>还没有文章，来发布第一篇吧！</p>
          </div>
        )}

        {!loading && !error && articles.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ArticleList
