## 背景与问题

我的主力开发机是 Mac，但实际的代码运行环境是一台 Linux 服务器。更麻烦的是，这台服务器在国内，访问不了 Anthropic 的 API，所以 Claude Code 没法直接在上面用。

折腾了一番后，找到了一个顺畅的工作流：在 Mac 本地用 Colima 跑一个 Docker 容器作为开发环境，Claude Code 在容器里跑，代码通过 rsync 同步到远端服务器部署。

## 整体架构

```
Mac (本地)
  └── Colima VM
        └── Docker 容器 (开发环境)
              ├── Claude Code
              ├── Go 工具链
              └── 代码目录
                    └── rsync / git push → 远端 Linux 服务器
```

## 容器配置

Dockerfile 的关键部分：

```dockerfile
FROM ubuntu:22.04

# 基础工具
RUN apt-get update && apt-get install -y \
    curl git openssh-server rsync \
    build-essential

# Go
RUN curl -L https://go.dev/dl/go1.23.linux-arm64.tar.gz | \
    tar -C /usr/local -xz
ENV PATH=$PATH:/usr/local/go/bin

# Node.js（Claude Code 依赖）
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

# SSH 配置（方便从 Mac terminal 直接连进来）
RUN mkdir /var/run/sshd
EXPOSE 22
```

## Claude Code 配置

在容器里安装 Claude Code 后，需要配置代理让它能访问 Anthropic API：

```bash
# 容器内设置代理（指向 Mac 宿主机）
export HTTPS_PROXY=http://host.docker.internal:7890

# 启动 Claude Code
claude
```

宿主机上需要开启允许局域网连接的代理，这样容器内的流量就能通过 Mac 出去访问 Anthropic API 了。

## 代码同步

本地改好代码后，用 rsync 同步到远端服务器：

```bash
rsync -avz --exclude='.git' --exclude='vendor' \
    ./myproject/ \
    user@remote-server:/home/user/myproject/
```

我把这个命令包装成了 Makefile target，`make deploy` 一键同步。

<div class="detail-callout">
  这套工作流用了两个月，非常稳定。Claude Code 的 bypassPermissions 模式在这种受控的容器环境里很好用，不用每次都确认。
</div>
