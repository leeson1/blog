import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDarkMode } from '../utils/darkMode'

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [dark, toggleDark] = useDarkMode()
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
            博客
          </Link>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-600 dark:text-gray-300 text-sm">
                  你好，<span className="font-medium text-gray-800 dark:text-gray-100">{user.username}</span>
                </span>
                <button
                  onClick={toggleDark}
                  className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="切换黑夜模式"
                >
                  {dark ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
                {location.pathname !== '/publish' && (
                  <Link
                    to="/publish"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    写文章
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium transition-colors"
                >
                  退出
                </button>
              </>
            ) : (
              <Link to="/login" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors">
                登录
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
