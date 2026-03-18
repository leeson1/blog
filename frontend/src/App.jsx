import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import ArticleList from './pages/ArticleList'
import ArticleDetail from './pages/ArticleDetail'
import PublishArticle from './pages/PublishArticle'
import AdminLayout from './pages/admin/AdminLayout'
import Users from './pages/admin/Users'
import Articles from './pages/admin/Articles'
import EditArticle from './pages/admin/EditArticle'
import Comments from './pages/admin/Comments'

function RequireAuth({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (!token) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><ArticleList /></RequireAuth>} />
        <Route path="/articles/:id" element={<ArticleDetail />} />
        <Route path="/publish" element={<RequireAuth><PublishArticle /></RequireAuth>} />

        {/* Admin */}
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<Navigate to="/admin/users" replace />} />
          <Route path="users" element={<Users />} />
          <Route path="articles" element={<Articles />} />
          <Route path="articles/:id/edit" element={<EditArticle />} />
          <Route path="comments" element={<Comments />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
