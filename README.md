# 博客系统

基于 React + Vite 前端与 C++ Drogon 后端的博客系统，使用 PostgreSQL 存储数据，Docker 容器化部署。

## 技术栈

- **前端**：React 18 + Vite + Tailwind CSS + React Router v6 + Axios + @uiw/react-md-editor + react-markdown
- **后端**：C++ Drogon 框架
- **数据库**：PostgreSQL 16
- **部署**：Docker Compose + GitHub Actions CI/CD

## 项目结构

```
project1/
├── frontend/               # React 前端
├── backend/                # C++ Drogon 后端
│   ├── src/
│   │   ├── main.cc
│   │   ├── controllers/
│   │   ├── repositories/   # 数据访问层（Repository 模式）
│   │   ├── models/
│   │   └── utils/
│   ├── test/               # 单元测试（Google Test / Google Mock）
│   ├── scripts/
│   │   ├── db-backup.sh    # 数据库备份
│   │   └── db-restore.sh   # 数据库恢复
│   ├── CMakeLists.txt
│   └── Dockerfile
├── docker-compose.yml
└── .github/workflows/
    └── deploy.yml          # CI/CD 自动构建并部署
```

## 本地开发

在开发容器内运行：

```bash
# 启动所有服务（前端、后端、数据库）
cd /workspace/project1
docker compose up -d
```

或分别启动：

```bash
# 后端
cd backend && mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTS=OFF
make -j$(nproc)
./blog_backend

# 前端
cd frontend && npm install && npm run dev
```

前端运行在 `http://localhost:8000`，API 自动代理到后端 8080 端口。

## 预设账户

| 用户名 | 密码 |
|--------|------|
| admin  | admin123 |
| leeson | leeson123 |

## CI/CD

推送到 `main` 分支后，GitHub Actions 自动：

1. 构建前端和后端 Docker 镜像，推送到 GHCR
2. 将 `docker-compose.yml` 同步到服务器
3. 在服务器上拉取新镜像并重启容器

## 数据库备份与恢复

```bash
# 备份（在服务器上执行）
cd ~/blog
bash backend/scripts/db-backup.sh
# 生成 backup_YYYYMMDD_HHMMSS.sql

# 恢复
bash backend/scripts/db-restore.sh backup_YYYYMMDD_HHMMSS.sql
```

## 服务器迁移步骤

1. **在旧服务器上备份数据库**

```bash
cd ~/blog
bash backend/scripts/db-backup.sh
```

2. **将备份文件传到新服务器**

```bash
scp backup_*.sql ubuntu@新服务器IP:~/
```

3. **在新服务器上安装 Docker**

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

4. **配置 GitHub Actions Secrets**（在仓库 Settings → Secrets 中更新）

| Secret | 说明 |
|--------|------|
| SERVER_HOST | 新服务器 IP |
| SERVER_USER | SSH 用户名 |
| SERVER_SSH_KEY | SSH 私钥 |

5. **触发一次部署**（推送任意 commit 或在 Actions 页面手动触发）

   部署完成后，新服务器上的容器会自动启动。

6. **恢复数据库**

```bash
cd ~/blog
bash backend/scripts/db-restore.sh ~/backup_*.sql
```

7. **验证服务正常**

```bash
docker compose ps
curl http://localhost/api/articles
```

## API 接口

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|----------|
| POST | /api/login | 登录 | 否 |
| GET  | /api/articles | 文章列表 | 否 |
| GET  | /api/articles/:id | 文章详情+评论 | 否 |
| POST | /api/articles | 发布文章 | 是 |
| POST | /api/articles/:id/comments | 发表评论 | 是 |
| POST | /api/upload/image | 上传图片 | 是 |

认证方式：请求头 `Authorization: Bearer <token>`
