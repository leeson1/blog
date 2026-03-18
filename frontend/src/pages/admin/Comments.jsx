import { useEffect, useState } from 'react'
import api from '../../utils/api'

export default function Comments() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 20 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const limit = 20

  const fetchComments = async (p = page) => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/comments?page=${p}&limit=${limit}`)
      setData(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchComments(page) }, [page])

  const handleEdit = (comment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const handleSave = async (id) => {
    if (!editContent.trim()) return
    setSaving(true)
    try {
      await api.put(`/admin/comments/${id}`, { content: editContent.trim() })
      setData(prev => ({
        ...prev,
        items: prev.items.map(c => c.id === id ? { ...c, content: editContent.trim() } : c)
      }))
      setEditingId(null)
    } catch (err) {
      alert(err.response?.data?.error || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除该留言？')) return
    try {
      await api.delete(`/admin/comments/${id}`)
      setData(prev => ({
        ...prev,
        total: prev.total - 1,
        items: prev.items.filter(c => c.id !== id)
      }))
    } catch (err) {
      alert(err.response?.data?.error || '删除失败')
    }
  }

  const totalPages = Math.ceil(data.total / limit) || 1

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        留言管理
        {data.total > 0 && <span className="ml-2 text-sm font-normal text-gray-400">共 {data.total} 条</span>}
      </h1>

      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-750">
                <tr>
                  {['ID', '文章ID', '作者', '内容', '时间', '操作'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.items.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 align-top">{c.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 align-top">{c.article_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 align-top whitespace-nowrap">{c.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 align-top max-w-xs">
                      {editingId === c.id ? (
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={3}
                          className="w-full px-2 py-1 text-sm border border-indigo-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                        />
                      ) : (
                        <span className="line-clamp-2">{c.content}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 align-top whitespace-nowrap">{c.created_at}</td>
                    <td className="px-4 py-3 text-sm align-top whitespace-nowrap space-x-3">
                      {editingId === c.id ? (
                        <>
                          <button
                            onClick={() => handleSave(c.id)} disabled={saving}
                            className="text-indigo-500 hover:text-indigo-700 transition-colors text-xs disabled:opacity-60"
                          >
                            {saving ? '保存中' : '保存'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-400 hover:text-gray-600 transition-colors text-xs"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(c)}
                            className="text-indigo-500 hover:text-indigo-700 transition-colors text-xs"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-red-500 hover:text-red-700 transition-colors text-xs"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.items.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">暂无留言</div>
            )}
          </div>

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
