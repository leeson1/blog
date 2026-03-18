import { useEffect, useState } from 'react'
import api from '../../utils/api'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ username: '', password: '', role: 'user' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/users')
      setUsers(res.data)
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.username.trim() || !form.password.trim()) {
      setFormError('用户名和密码不能为空')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/admin/users', form)
      setForm({ username: '', password: '', role: 'user' })
      fetchUsers()
    } catch (err) {
      setFormError(err.response?.data?.error || '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, username) => {
    if (!confirm(`确定删除用户「${username}」？`)) return
    try {
      await api.delete(`/admin/users/${id}`)
      setUsers(users.filter(u => u.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || '删除失败')
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">用户管理</h1>

      {/* Create form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">创建新用户</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">用户名</label>
            <input
              type="text" value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="用户名"
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">密码</label>
            <input
              type="text" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="密码"
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">角色</label>
            <select
              value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <button
            type="submit" disabled={submitting}
            className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? '创建中...' : '创建'}
          </button>
          {formError && <span className="text-sm text-red-500">{formError}</span>}
        </form>
      </div>

      {/* User table */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-750">
              <tr>
                {['ID', '用户名', '角色', '创建时间', '操作'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{u.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{u.username}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                      {u.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{u.created_at}</td>
                  <td className="px-4 py-3 text-sm">
                    {u.id !== currentUser.id && (
                      <button
                        onClick={() => handleDelete(u.id, u.username)}
                        className="text-red-500 hover:text-red-700 transition-colors text-xs"
                      >
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">暂无用户</div>
          )}
        </div>
      )}
    </div>
  )
}
