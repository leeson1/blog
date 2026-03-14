import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MDEditor from '@uiw/react-md-editor'
import Navbar from '../components/Navbar'
import api from '../utils/api'
import { useDarkMode } from '../utils/darkMode'

function PublishArticle() {
  const navigate = useNavigate()
  const [dark] = useDarkMode()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const editorWrapperRef = useRef(null)

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!title.trim()) { setError('请输入文章标题'); return }
    if (!content.trim()) { setError('请输入文章内容'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/articles', { title: title.trim(), content })
      navigate(`/articles/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || '发布失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleImageUpload = useCallback(async (file) => {
    if (!file) return null
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      return res.data.url
    } catch (err) {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">发布新文章</h1>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                文章标题 <span className="text-red-500">*</span>
              </label>
              <input
                id="title" type="text" value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入文章标题"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-lg"
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
              <span className="text-xs text-gray-400 dark:text-gray-500">支持 JPG、PNG、GIF、WebP 格式，也可直接在编辑器内粘贴图片</span>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                文章内容 <span className="text-red-500">*</span>
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">支持 Markdown 格式</span>
              </label>
              <div data-color-mode={dark ? 'dark' : 'light'} ref={editorWrapperRef}>
                <MDEditor value={content} onChange={setContent} height={500} preview="live" hideToolbar={false} />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex items-center space-x-4 pt-2">
              <button
                type="button" onClick={handleSubmit} disabled={submitting}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '发布中...' : '发布文章'}
              </button>
              <button
                type="button" onClick={() => navigate('/')}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PublishArticle
