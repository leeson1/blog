import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

export function About() {
  return (
    <div id="about" className="min-h-screen">
      <div className="max-w-2xl mx-auto px-8 py-16">
        {/* 返回按钮 */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors mb-12 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>

        <div className="space-y-10">
          <h1 className="text-3xl text-gray-900">关于我</h1>

          {/* 简介 */}
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              我是 <strong className="text-gray-900">Jason Li</strong>，后端工程师。
              主要用 <strong className="text-gray-900">Go</strong> 做游戏服务器系统，
              用 <strong className="text-gray-900">C++ + CUDA</strong> 做视频处理管线，
              偶尔折腾部署工具和开发环境。
            </p>
            <p>
              这个 Blog 是我的公开笔记本，写给未来的自己，也分享给路过的人。不定期更新，但每篇都认真写。
            </p>
          </div>

          {/* 技术栈 */}
          <div className="space-y-3">
            <h2 className="text-lg text-gray-900">技术栈</h2>
            <div className="flex flex-wrap gap-2">
              {['Go', 'C++', 'CUDA', 'DeepStream', 'GStreamer', 'Docker', 'Redis', 'Protobuf', 'TcaplusDB', 'OpenCV'].map(s => (
                <span key={s} className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full">{s}</span>
              ))}
            </div>
          </div>

          {/* 经历 */}
          <div className="space-y-3">
            <h2 className="text-lg text-gray-900">经历</h2>
            <div className="space-y-4">
              {[
                { year: '2023 — 现在', role: 'Backend Developer', desc: '游戏服务器 · Go · Protobuf' },
                { year: '2021 — 2023', role: 'C++ Engineer', desc: '视频处理 · DeepStream · CUDA' },
                { year: '2019 — 2021', role: '初级开发', desc: '学习 · 踩坑 · 成长' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                    {i < 2 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="text-xs text-gray-400">{item.year}</div>
                    <div className="text-sm text-gray-900 font-medium">{item.role}</div>
                    <div className="text-sm text-gray-500">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 联系 */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h2 className="text-lg text-gray-900">联系</h2>
            <div className="space-y-2">
              <a
                href="mailto:774272440@qq.com"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                ✉️ 774272440@qq.com
              </a>
              <a
                href="https://github.com/leeson1"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                💻 GitHub / leeson1
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
