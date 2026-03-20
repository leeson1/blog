## 起因

公司新来了安全策略，Docker Desktop 因为 License 问题被列入了受限软件名单。我需要找一个替代方案，在 Mac 上继续用 Docker。

调研了一圈，最终选了 Colima。用了两个月，非常满意，这里分享一下理由。

## Colima 是什么？

Colima（Container Linux on Mac）是一个基于 Lima 的轻量级容器运行时。它在 Mac 上创建一个 Linux 虚拟机，然后在里面跑 Docker 或 containerd。

对用户来说，体验和 Docker Desktop 几乎一样——`docker` 命令照常用，Compose 照常用，只是换了底层实现。

## 安装很简单

```bash
brew install colima docker docker-compose

# 启动（Apple Silicon 用户用 vz 驱动，性能更好）
colima start --arch aarch64 --vm-type vz --vz-rosetta

# 验证
docker ps
```

## 和 Docker Desktop 比起来

- **资源占用**：Colima 明显更轻，内存占用低 30-40%，风扇转得少多了
- **启动速度**：Colima 启动比 Docker Desktop 快一些
- **GUI**：没有，但我不需要——终端就够了
- **Volume 挂载性能**：用 VirtioFS 的话速度很快，不比 Docker Desktop 差

<div class="detail-callout">
  如果你只用 CLI，Colima 在各方面都是 Docker Desktop 的平替，而且完全免费、没有 License 问题。
</div>

## 我的日常工作流

我用 Colima 跑了一个 Docker 容器作为开发环境，通过 SSH 进去写代码，Claude Code 也跑在里面。需要访问 Anthropic API 时，流量通过本地代理转发。整个链路跑得非常稳定。
