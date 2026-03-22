export default function About() {
  return (
    <div id="about">
      <div className="section-wrap">
        <h2 className="sec-title">关于我</h2>
        <div className="about-grid">
          <div className="about-card wide">
            <div className="card-label">简介</div>
            <p className="bio-text">
              我是 <strong>Jason Li</strong>，后端工程师。主要用 <strong>Go</strong> 做游戏服务器系统，
              用 <strong>C++ + CUDA</strong> 做视频处理管线，偶尔折腾部署工具和开发环境。
              这个 Blog 是我的公开笔记本，写给未来的自己，也分享给路过的人。
            </p>
          </div>

          <div className="about-card">
            <div className="card-label">技术栈</div>
            <div className="chip-grid">
              {['Go', 'C++', 'CUDA', 'DeepStream', 'GStreamer', 'Docker', 'Redis', 'Protobuf', 'TcaplusDB', 'OpenCV'].map(s => (
                <span key={s} className="chip">{s}</span>
              ))}
            </div>
          </div>

          <div className="about-card">
            <div className="card-label">经历</div>
            <div className="timeline">
              <div className="tl-item">
                <div className="tl-dot-col"><div className="tl-dot"></div><div className="tl-line"></div></div>
                <div>
                  <div className="tl-year">2023 — 现在</div>
                  <div className="tl-role">Backend Developer</div>
                  <div className="tl-co">游戏服务器 · Go · Protobuf</div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-dot-col"><div className="tl-dot"></div><div className="tl-line"></div></div>
                <div>
                  <div className="tl-year">2021 — 2023</div>
                  <div className="tl-role">C++ Engineer</div>
                  <div className="tl-co">视频处理 · DeepStream · CUDA</div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-dot-col"><div className="tl-dot"></div></div>
                <div>
                  <div className="tl-year">2019 — 2021</div>
                  <div className="tl-role">初级开发</div>
                  <div className="tl-co">学习 · 踩坑 · 成长</div>
                </div>
              </div>
            </div>
          </div>

          <div className="about-card wide">
            <div className="card-label">联系</div>
            <div className="contact-list">
              <a href="mailto:774272440@qq.com" className="contact-row">
                <div className="contact-row-left"><span>✉️</span><span>774272440@qq.com</span></div>
                <span className="contact-row-muted">→</span>
              </a>
              <a href="https://github.com/leeson1" target="_blank" rel="noopener" className="contact-row">
                <div className="contact-row-left"><span>💻</span><span>GitHub</span></div>
                <span className="contact-row-muted">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
