import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import ArticleList from './pages/ArticleList'
import ArticleDetail from './pages/ArticleDetail'
import PublishArticle from './pages/PublishArticle'

function RequireAuth({ children }) {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <ArticleList />
            </RequireAuth>
          }
        />
        <Route path="/articles/:id" element={<ArticleDetail />} />
        <Route
          path="/publish"
          element={
            <RequireAuth>
              <PublishArticle />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
