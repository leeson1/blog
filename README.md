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
├── sql/
│   └── schema.sql          # 数据库表结构
├── docker-compose.yml
└── .github/workflows/
    └── deploy.yml          # CI/CD 自动构建并部署
```

## 本地开发

在开发容器内运行：

```bash
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

## 全新服务器部署步骤

### 1. 安装 Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. 创建 pg-network（PostgreSQL 独立网络）

```bash
docker network create pg-network
```

### 3. 启动 PostgreSQL

```bash
docker run -d \
  --name postgres \
  --network pg-network \
  --restart always \
  -e POSTGRES_DB=blog \
  -e POSTGRES_USER=blog \
  -e POSTGRES_PASSWORD=blogpassword \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16
```

### 4. 配置 GitHub Actions Secrets

在仓库 Settings → Secrets and variables → Actions 中添加：

| Secret | 说明 |
|--------|------|
| `SERVER_HOST` | 服务器 IP |
| `SERVER_USER` | SSH 用户名（如 `ubuntu`） |
| `SERVER_SSH_KEY` | SSH 私钥 |

### 5. 触发部署

推送任意 commit 到 `main` 分支，或在 Actions 页面手动触发。

GitHub Actions 会自动：
1. 构建前端和后端 Docker 镜像，推送到 GHCR
2. 将 `docker-compose.yml` 同步到服务器 `~/blog/`
3. 在服务器上拉取新镜像并重启容器

部署完成后服务监听在 `127.0.0.1:13000`，通过 nginx 对外暴露。

### 6. 配置 nginx 反向代理（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:13000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## CI/CD

推送到 `main` 分支后，GitHub Actions 自动完成构建和部署，无需手动操作。

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

3. **在新服务器上按「全新部署步骤」完成部署**

4. **恢复数据库**

```bash
cd ~/blog
bash backend/scripts/db-restore.sh ~/backup_*.sql
```

5. **验证服务正常**

```bash
docker compose ps
curl http://localhost:13000/api/articles
```

## API 接口

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | 登录，返回 JWT token |
| GET  | `/api/articles` | 文章列表 |
| GET  | `/api/articles/:id` | 文章详情 + 评论 |

### 需要认证（普通用户）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/articles` | 发布文章 |
| POST | `/api/articles/:id/comments` | 发表评论 |
| POST | `/api/upload/image` | 上传图片 |

### 需要认证（管理员）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET    | `/api/admin/users` | 用户列表 |
| POST   | `/api/admin/users` | 创建用户 |
| DELETE | `/api/admin/users/:id` | 删除用户 |
| GET    | `/api/admin/articles` | 文章列表（管理视图） |
| PUT    | `/api/admin/articles/:id` | 编辑文章 |
| DELETE | `/api/admin/articles/:id` | 删除文章 |
| GET    | `/api/admin/comments` | 留言列表 |
| PUT    | `/api/admin/comments/:id` | 编辑留言 |
| DELETE | `/api/admin/comments/:id` | 删除留言 |

认证方式：请求头 `Authorization: Bearer <token>`
