import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'

export default function Articles() {
  const navigate = useNavigate()
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 20 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 20

  const fetchArticles = async (p = page) => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/articles?page=${p}&limit=${limit}`)
      setData(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchArticles(page) }, [page])

  const handleDelete = async (id, title) => {
    if (!confirm(`确定删除文章「${title}」？此操作同时删除其所有留言。`)) return
    try {
      await api.delete(`/admin/articles/${id}`)
      fetchArticles(page)
    } catch (err) {
      alert(err.response?.data?.error || '删除失败')
    }
  }

  const totalPages = Math.ceil(data.total / limit) || 1

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        文章管理
        {data.total > 0 && <span className="ml-2 text-sm font-normal text-gray-400">共 {data.total} 篇</span>}
      </h1>

      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-750">
                <tr>
                  {['ID', '标题', '作者', '发布时间', '操作'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.items.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{a.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">
                      {a.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{a.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{a.created_at}</td>
                    <td className="px-4 py-3 text-sm space-x-3">
                      <button
                        onClick={() => navigate(`/admin/articles/${a.id}/edit`)}
                        className="text-indigo-500 hover:text-indigo-700 transition-colors text-xs"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(a.id, a.title)}
                        className="text-red-500 hover:text-red-700 transition-colors text-xs"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.items.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">暂无文章</div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                上一页
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
