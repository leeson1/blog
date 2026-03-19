# Jason Li | Blog

基于纯静态 HTML/CSS/JS 的个人博客，部署在 GitHub Pages。

**访问地址：** https://leeson1.github.io/blog/

## 技术栈

- 纯静态：HTML + CSS + vanilla JS，无框架，无构建步骤
- 评论系统：[utterances](https://utteranc.es/)（基于 GitHub Issues）
- 部署：GitHub Pages + GitHub Actions 自动部署

## 项目结构

```
blog/
├── index.html          # 主页面（首页 + 文章列表 + 关于我）
├── assets/
│   ├── style.css       # 全站样式
│   └── main.js         # 交互逻辑（动态加载文章）
├── posts/
│   ├── index.json      # 文章元数据列表
│   ├── stateless-gamesvr.html
│   ├── cuda-memory.html
│   └── ...             # 每篇文章一个 HTML 片段文件
└── .github/workflows/
    └── pages.yml       # 推送 main 分支自动部署
```

## 新增文章

1. 在 `posts/` 下新建 `your-slug.html`，写入文章正文（HTML 片段，无需 `<html>/<head>` 等）
2. 在 `posts/index.json` 中添加一条元数据：
   ```json
   {
     "id": "your-slug",
     "tag": "Go",
     "tags": ["go", "arch"],
     "title": "文章标题",
     "date": "2025.04.01",
     "readTime": "8 min"
   }
   ```
3. 推送到 `main` 分支，GitHub Actions 自动部署

## 本地预览

需要通过 HTTP 服务器打开（直接双击 index.html 无法 fetch 本地文件）：

```bash
# Python
python3 -m http.server 8080

# 或 Node.js
npx serve .
```

访问 http://localhost:8080

## 首次部署配置

### 1. 启用 GitHub Pages

仓库 Settings → Pages → Source → 选择 **GitHub Actions**

### 2. 安装 utterances App

访问 https://github.com/apps/utterances 并授权到 `leeson1/blog` 仓库。

安装后，读者可以用 GitHub 账号在文章页面留言，评论会以 Issue 形式存储在本仓库中。

## 评论系统

使用 [utterances](https://utteranc.es/)，基于 GitHub Issues 存储评论。

- 读者需要 GitHub 账号才能评论
- 每篇文章对应一个 Issue（以文章标题为 Issue 标题）
- 评论数据存储在本仓库的 Issues 中
