import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ArticleCard from './ArticleCard'

const RECENT_COUNT = 5
const DAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export default function Home() {
  const [posts, setPosts] = useState([])
  const day = DAYS[new Date().getDay()]

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'posts/index.json')
      .then(r => r.json())
      .then(setPosts)
      .catch(() => setPosts([]))
  }, [])

  const recent = posts.slice(0, RECENT_COUNT)

  return (
    <>
      <div id="home">
        <div className="section-wrap home-inner">
          <div className="home-avatar">
            <img src={import.meta.env.BASE_URL + 'assets/avatar.jpg'} alt="avatar" />
          </div>
          <h1 className="home-greeting">
            嘿，Jason<br />在这里。<br />
            今天是<span className="day">{day}</span>。
          </h1>
          <p className="home-bio">
            写 Go 和 C++ 的后端工程师，专注游戏服务器架构与视频处理管线。
            这里记录技术探索、踩坑经历，和一些值得分享的想法。不定期更新，但每篇都认真写。
          </p>
          <Link to="/articles" className="home-cta" id="home-cta">看看我写了什么 →</Link>
        </div>
      </div>

      <div id="articles">
        <div className="section-wrap">
          <h2 className="sec-title">文章</h2>
          <div className="article-list" id="home-article-list">
            {recent.map(p => <ArticleCard key={p.id} post={p} />)}
          </div>
          <div className="articles-footer">
            <span className="articles-footer-count" id="articles-footer-count">
              {posts.length > 0 && `显示最近 ${RECENT_COUNT} 篇 · 共 ${posts.length} 篇`}
            </span>
            <Link to="/articles" className="btn-view-all" id="btn-view-all">查看全部文章 →</Link>
          </div>
        </div>
      </div>
    </>
  )
}
