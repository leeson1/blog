import { ReactNode } from "react";
import { Link, NavLink } from "react-router";

interface SiteShellProps {
  children: ReactNode;
}

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-container site-header-inner">
          <Link to="/" className="site-brand" aria-label="Leeson 首页">
            <span className="site-brand-mark">L.</span>
            <span className="site-brand-name">LEESON / NOTES</span>
          </Link>

          <nav className="site-nav" aria-label="主导航">
            <NavLink to="/" end>
              首页
            </NavLink>
            <NavLink to="/articles">文章</NavLink>
            <NavLink to="/about">关于</NavLink>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="site-container site-footer-inner">
          <span>© {new Date().getFullYear()} Leeson</span>
          <span>保持好奇，持续记录。</span>
        </div>
      </footer>
    </div>
  );
}
