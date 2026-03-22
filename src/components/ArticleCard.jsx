import { Link } from 'react-router-dom'

export default function ArticleCard({ post }) {
  return (
    <Link
      to={`/articles/${post.id}`}
      className="article-card"
      data-id={post.id}
      data-tags={post.tags ? post.tags.join(' ') : ''}
    >
      <div className="article-body">
        <div className="article-title">{post.title}</div>
        <div className="article-meta">
          <span className="article-meta-tag">{post.tag}</span>
          <span>{post.date}</span>
          <span>{post.readTime}</span>
        </div>
      </div>
      <span className="article-arrow">→</span>
    </Link>
  )
}
