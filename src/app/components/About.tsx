import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ExperienceItem {
  year: string;
  role: string;
  desc: string;
}

interface ContactItem {
  icon: string;
  label: string;
  href: string;
  external?: boolean;
}

export function About() {
  const [intro, setIntro] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    const t = Date.now();

    fetch(`${base}about/intro.md?t=${t}`)
      .then(r => r.text())
      .then(setIntro)
      .catch(() => setIntro(''));

    fetch(`${base}about/skills.json?t=${t}`)
      .then(r => r.json())
      .then(setSkills)
      .catch(() => setSkills([]));

    fetch(`${base}about/experience.json?t=${t}`)
      .then(r => r.json())
      .then(setExperience)
      .catch(() => setExperience([]));

    fetch(`${base}about/contact.json?t=${t}`)
      .then(r => r.json())
      .then(setContacts)
      .catch(() => setContacts([]));
  }, []);

  return (
    <div id="about" className="min-h-screen dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-8 py-16">
        {/* 返回按钮 */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-12 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>

        <div className="space-y-10">
          <h1 className="text-3xl text-gray-900 dark:text-gray-100">关于我</h1>

          {/* 简介 */}
          <div className="about-intro space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                strong: ({ children }) => (
                  <strong className="text-gray-900 dark:text-gray-100">{children}</strong>
                ),
              }}
            >{intro}</ReactMarkdown>
          </div>

          {/* 技术栈 */}
          {skills.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg text-gray-900 dark:text-gray-100">技术栈</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map(s => (
                  <span key={s} className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* 经历 */}
          {experience.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg text-gray-900 dark:text-gray-100">经历</h2>
              <div className="space-y-4">
                {experience.map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                      {i < experience.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />}
                    </div>
                    <div className="pb-4">
                      <div className="text-xs text-gray-400 dark:text-gray-500">{item.year}</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">{item.role}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 联系 */}
          {contacts.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <h2 className="text-lg text-gray-900 dark:text-gray-100">联系</h2>
              <div className="space-y-2">
                {contacts.map(c => (
                  <a
                    key={c.href}
                    href={c.href}
                    {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  >
                    {c.icon} {c.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
