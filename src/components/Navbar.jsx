import { NavLink } from 'react-router-dom'
import { useTheme } from '../App'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <nav>
      <NavLink to="/" className="nav-logo" id="nav-logo">Jason Li</NavLink>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ul className="nav-links">
          <li>
            <NavLink to="/" end id="nav-home" className={({ isActive }) => isActive ? 'active' : ''}>
              首页
            </NavLink>
          </li>
          <li>
            <NavLink to="/articles" id="nav-articles" className={({ isActive }) => isActive ? 'active' : ''}>
              文章
            </NavLink>
          </li>
          <li>
            <NavLink to="/about" id="nav-about" className={({ isActive }) => isActive ? 'active' : ''}>
              关于我
            </NavLink>
          </li>
        </ul>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="切换主题" id="theme-toggle">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </nav>
  )
}
