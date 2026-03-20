## 为什么要折腾终端？

每天盯着终端看 8 小时，一个赏心悦目的配置绝对值得花时间搞。更重要的是，好的 prompt 能显示关键信息（git 状态、当前目录、命令执行时间），减少认知负担。

这篇记录一下我目前的配置，方便以后换机器直接复用。

## 基础工具

```bash
# 安装 Homebrew（如果还没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 iTerm2
brew install --cask iterm2

# 安装 zsh + oh-my-zsh
brew install zsh
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# 安装 Powerlevel10k
brew install romkatv/powerlevel10k/powerlevel10k
echo "source $(brew --prefix)/opt/powerlevel10k/powerlevel10k.zsh-theme" >> ~/.zshrc
```

## Dracula 主题

打开 iTerm2 → Preferences → Profiles → Colors → Color Presets → Import，导入 Dracula 的 `.itermcolors` 文件（从 draculatheme.com 下载）。

Dracula 的配色非常护眼：深紫背景，饱和度适中的彩色语法高亮，长时间使用不累眼睛。

## Powerlevel10k 配置要点

第一次运行 `zsh` 会触发 p10k 的向导，按自己喜好配置就好。我的偏好：

- Style: Rainbow（彩色分段式 prompt）
- 左侧显示：当前目录、git 状态
- 右侧显示：命令执行时间、时间
- 开启 instant prompt（启动速度快很多）

## 几个必装的 zsh 插件

```bash
# .zshrc 的 plugins 部分
plugins=(
    git
    zsh-autosuggestions      # 自动补全历史命令
    zsh-syntax-highlighting  # 实时语法高亮
    z                        # 智能目录跳转
)
```

<div class="detail-callout">
  <code>z</code> 这个插件极其好用——记录你访问过的目录，输入目录名的一部分就能跳过去，比 <code>cd</code> 快太多了。
</div>
