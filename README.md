# 博客系统

基于 React + Vite 前端与 C++ Drogon 后端的博客系统。

## 技术栈

- **前端**：React 18 + Vite + Tailwind CSS + React Router v6 + Axios + @uiw/react-md-editor + react-markdown
- **后端**：C++ Drogon 框架
- **数据存储**：CSV 文件

## 项目结构

```
project1/
├── frontend/          # React 前端
└── backend/           # C++ Drogon 后端
    ├── src/
    │   ├── main.cc
    │   ├── controllers/
    │   └── utils/
    ├── data/
    │   ├── users.csv
    │   ├── articles.csv
    │   ├── comments.csv
    │   └── image/
    ├── CMakeLists.txt
    └── config.json
```

## 启动方法

### 1. 启动后端

确保已安装 Drogon 框架（容器内已安装）。

```bash
cd /workspace/project1/backend
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
./blog_backend
```

后端监听 `0.0.0.0:8080`。

### 2. 启动前端

确保已安装 Node.js（推荐 v18+）。

```bash
cd /workspace/project1/frontend
npm install
npm run dev
```

前端运行在 `http://localhost:3000`，API 请求自动代理到后端 8080 端口。

## 预设账户

| 用户名 | 密码 |
|--------|------|
| admin  | admin123 |
| leeson | leeson123 |

## API 接口

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|----------|
| POST | /api/login | 登录 | 否 |
| GET  | /api/articles | 文章列表 | 否 |
| GET  | /api/articles/:id | 文章详情+评论 | 否 |
| POST | /api/articles | 发布文章 | 是 |
| POST | /api/articles/:id/comments | 发表评论 | 是 |
| POST | /api/upload/image | 上传图片 | 是 |
| GET  | /data/image/:filename | 获取图片 | 否 |

认证方式：请求头 `Authorization: Bearer <token>`

## 功能说明

1. **登录**：使用预设账户登录，token 存储在 localStorage
2. **文章列表**：首页展示所有文章，按发布时间倒序排列
3. **文章详情**：支持 Markdown 渲染（包含 GFM 扩展），下方显示评论
4. **发布文章**：支持 Markdown 实时预览编辑器，支持图片上传插入
5. **评论**：登录用户可对任意文章发表评论
6. **图片上传**：图片存储于 `backend/data/image/` 目录
