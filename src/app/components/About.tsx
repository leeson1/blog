import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteShell } from "./SiteShell";

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
    <SiteShell>
      <div id="about" className="site-container page-wrap about-page">
        <header className="page-heading about-heading">
          <div>
            <p className="eyebrow">ABOUT / PROFILE</p>
            <h1>关于我</h1>
          </div>
          <p>写代码，也记录代码背后的判断。</p>
        </header>

        <section className="about-overview">
          <div className="about-portrait">
            <img src={import.meta.env.BASE_URL + 'assets/avatar.jpg'} alt="Leeson 的头像" />
            <span>Leeson · Backend Engineer</span>
          </div>

          <div className="about-intro">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                strong: ({ children }) => <strong>{children}</strong>,
              }}
            >{intro}</ReactMarkdown>
          </div>
        </section>

        <div className="about-details">
          {skills.length > 0 && (
            <section className="about-section">
              <p className="eyebrow">TOOLBOX</p>
              <h2>技术栈</h2>
              <div className="skills-list">
                {skills.map(s => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </section>
          )}

          {experience.length > 0 && (
            <section className="about-section experience-section">
              <p className="eyebrow">EXPERIENCE</p>
              <h2>经历</h2>
              <div className="experience-list">
                {experience.map((item, i) => (
                  <div key={i} className="experience-item">
                    <div className="experience-year">{item.year}</div>
                    <div>
                      <h3>{item.role}</h3>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {contacts.length > 0 && (
          <section className="contact-section">
            <div>
              <p className="eyebrow">CONTACT</p>
              <h2>保持联系</h2>
            </div>
            <div className="contact-links">
              {contacts.map(contact => (
                <a
                  key={contact.href}
                  href={contact.href}
                  {...(contact.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  <span>{contact.label}</span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>
        )}

        <Link to="/" className="text-link about-back">返回首页</Link>
      </div>
    </SiteShell>
  );
}
