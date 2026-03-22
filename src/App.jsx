import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './components/Home'
import AllArticles from './components/AllArticles'
import ArticleDetail from './components/ArticleDetail'
import About from './components/About'

export const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} })
export const useTheme = () => useContext(ThemeContext)

function AppContent() {
  const location = useLocation()
  const isDetail = location.pathname.startsWith('/articles/')

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/articles" element={<AllArticles />} />
        <Route path="/articles/:id" element={<ArticleDetail />} />
        <Route path="/about" element={<About />} />
      </Routes>
      {!isDetail && (
        <footer>
          <span className="footer-logo">Jason Li</span>
          <span>© 2026 · 感谢访问，下次再见。</span>
        </footer>
      )}
    </>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <AppContent />
    </ThemeContext.Provider>
  )
}
