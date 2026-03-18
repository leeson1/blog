import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MDEditor from '@uiw/react-md-editor'
import api from '../../utils/api'
import { useDarkMode } from '../../utils/darkMode'

export default function EditArticle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dark] = useDarkMode()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const editorWrapperRef = useRef(null)

  useEffect(() => {
    api.get(`/articles/${id}`).then(res => {
      setTitle(res.data.title)
      setContent(res.data.content)
    }).catch(() => {
      setError('加载失败')
    }).finally(() => setLoading(false))
  }, [id])

  const handleImageUpload = useCallback(async (file) => {
    if (!file) return null
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      return res.data.url
    } catch {
      alert('图片上传失败')
      return null
    }
  }, [])

  useEffect(() => {
    const wrapper = editorWrapperRef.current
    if (!wrapper) return
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          const url = await handleImageUpload(file)
          if (url) setContent(prev => (prev || '') + `\n![image](${url})\n`)
          break
        }
      }
    }
    wrapper.addEventListener('paste', handlePaste)
    return () => wrapper.removeEventListener('paste', handlePaste)
  }, [handleImageUpload])

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await handleImageUpload(file)
    if (url) setContent(prev => (prev || '') + `\n![image](${url})\n`)
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('请输入文章标题'); return }
    if (!content.trim()) { setError('请输入文章内容'); return }
    setError('')
    setSubmitting(true)
    try {
      await api.put(`/admin/articles/${id}`, { title: title.trim(), content })
      navigate('/admin/articles')
    } catch (err) {
      setError(err.response?.data?.error || '保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-400">加载中...</div>

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/articles')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition-colors"
        >
          ← 返回列表
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">编辑文章</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            文章标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text" value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="请输入文章标题"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-lg"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            插入图片
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            文章内容 <span className="text-red-500">*</span>
          </label>
          <div data-color-mode={dark ? 'dark' : 'light'} ref={editorWrapperRef}>
            <MDEditor value={content} onChange={setContent} height={500} preview="live" />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center space-x-4 pt-2">
          <button
            onClick={handleSubmit} disabled={submitting}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? '保存中...' : '保存修改'}
          </button>
          <button
            onClick={() => navigate('/admin/articles')}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
