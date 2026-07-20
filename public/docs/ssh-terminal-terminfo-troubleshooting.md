使用 Ghostty、cmux 和 Otty 连接同一台远程服务器时，我遇到了一个很迷惑的问题：Ghostty 一切正常，但 cmux 和 Otty 会出现提示符错位、窄窗口下光标位置异常，以及 `clear` 和 `Ctrl+L` 无法清屏。

最初看起来像是终端渲染器或 SSH 配置的问题，最终却定位到远端损坏的 `xterm-256color` terminfo。本文记录完整的判断过程和最终修复方法，方便以后快速排查同类问题。

---

## 问题现象

三个终端连接的是同一台服务器，使用的是同一套 Shell 和提示符配置。

| 终端 | 远端 `$TERM` | 表现 |
|------|--------------|------|
| Ghostty | `xterm-ghostty` | 正常 |
| cmux | `xterm-256color` | 异常 |
| Otty | `xterm-256color` | 异常 |

异常主要有两类。

### 窄窗口下提示符错位

窗口足够宽时看起来正常，但缩小窗口后，长提示符不能正确换行。执行命令后，下一行可能只剩一个残缺的 `<`，很像光标渲染失败。

### 无法清屏

在 cmux 和 Otty 的 SSH 会话中，下面三种操作都不能清屏，只会产生一个新的提示符：

```bash
clear
clear -x
```

以及：

```text
Ctrl+L
```

Ghostty 中则完全正常。

---

## 一开始怀疑了什么

### SSH 环境变量没有转发

Ghostty 的 SSH 集成会转发终端识别变量，并在需要时安装 terminfo。普通 SSH 客户端或其他终端不一定会执行 Ghostty 的包装逻辑。

因此先在本地 `~/.ssh/config` 中增加了：

```sshconfig
Host *
  SendEnv COLORTERM TERM_PROGRAM TERM_PROGRAM_VERSION
```

远端 sshd 则允许接收：

```text
AcceptEnv COLORTERM TERM_PROGRAM TERM_PROGRAM_VERSION
```

这项配置有助于远端识别终端程序，但没有解决本次问题。原因是 `SendEnv` 只负责环境变量转发，不会修复远端的终端能力数据库。

### cmux 的窗口尺寸同步异常

由于提示符只在窄窗口下出错，一度怀疑 cmux 没有把正确的行列数同步到远端 PTY。

这类问题可以通过以下命令检查：

```bash
stty size
echo "LINES=$LINES COLUMNS=$COLUMNS"
tput cols
```

但后来发现，修复 terminfo 后，窄窗口下的提示符错位也一起消失了。这说明提示符在换行和重绘时使用了错误的终端能力，而不只是窗口尺寸本身的问题。

---

## `$TERM` 和 terminfo 是什么

### `$TERM`

`$TERM` 告诉应用程序：当前连接的终端具有什么能力。

常见值包括：

```text
xterm-256color
xterm-ghostty
tmux-256color
screen-256color
```

检查当前终端类型：

```bash
echo "$TERM"
```

### terminfo

terminfo 是终端能力数据库。Shell、`clear`、`less`、`vim`、TUI 程序和提示符工具会根据 `$TERM` 查找对应条目。

其中记录了大量控制能力，例如：

- 移动光标
- 清除屏幕
- 清除当前行
- 自动换行
- 删除字符
- 颜色和文本样式
- 功能键对应的输入序列

标准清屏能力通常类似：

```text
clear=\E[H\E[2J
```

它最终对应两个 ANSI 控制序列：

```text
ESC [ H
ESC [ 2 J
```

如果 `$TERM` 对应的 terminfo 条目损坏，即使终端本身支持这些控制序列，`clear` 或提示符程序也可能不会正确发送它们。

---

## 如何定位是终端问题还是 terminfo 问题

### 第一步：绕过 terminfo，直接发送 ANSI 清屏序列

在异常的 cmux SSH 会话中执行：

```bash
printf '\033[H\033[2J'
```

结果可以正常清屏。

再执行完整终端复位：

```bash
printf '\033c'
```

同样可以正常清屏。

这一步非常关键，它证明了：

- cmux/Otty 能解析清屏控制序列；
- SSH 没有丢失转义序列；
- 终端渲染器本身没有坏；
- 问题发生在生成控制序列的环节。

### 第二步：比较不同 `$TERM` 下的 `clear`

执行：

```bash
TERM=xterm-256color command clear
```

无法清屏。

再执行：

```bash
TERM=xterm-ghostty command clear
```

可以正常清屏。

至此可以确定：远端的 `xterm-256color` terminfo 存在问题，而 `xterm-ghostty` 条目是正常的。

### 第三步：确认 `clear` 没有被别名或函数覆盖

```bash
type -a clear
```

本次结果是：

```text
clear is /usr/bin/clear
```

因此也排除了 Shell alias/function 的影响。

如果需要进一步查看 terminfo，可以执行：

```bash
infocmp -1 xterm-256color |
  grep -E '^[[:space:]]*(clear|E3)='
```

查看 `clear` 实际输出的字节：

```bash
TERM=xterm-256color command clear |
  od -An -tx1
```

正常清屏序列至少应包含：

```text
1b 5b 48 1b 5b 32 4a
```

---

## 最终解决方法

从本地导出正确的 `xterm-256color` terminfo，通过 SSH 传给远端，再安装到远端用户自己的 terminfo 目录：

```bash
infocmp -x xterm-256color |
  ssh dev 'mkdir -p "$HOME/.terminfo" && tic -x -o "$HOME/.terminfo" -'
```

其中 `dev` 是本地 `~/.ssh/config` 中的主机别名，也可以换成实际地址：

```bash
infocmp -x xterm-256color |
  ssh user@example.com 'mkdir -p "$HOME/.terminfo" && tic -x -o "$HOME/.terminfo" -'
```

这条命令分成三步。

### 导出本地 terminfo

```bash
infocmp -x xterm-256color
```

### 通过 SSH 传输文本

管道会把 `infocmp` 的输出直接交给远端 `tic`，不需要创建临时文件。

### 在远端编译安装

```bash
mkdir -p "$HOME/.terminfo"
tic -x -o "$HOME/.terminfo" -
```

最终条目安装到：

```text
~/.terminfo/
```

这是用户级安装，不需要修改 `/usr/share/terminfo`，通常也不需要 `sudo`。

重新连接 SSH 后，以下问题全部恢复正常：

- `clear` 可以清屏；
- `clear -x` 可以清屏；
- `Ctrl+L` 可以清屏；
- 窄窗口下长提示符可以正确换行；
- 光标和提示符重绘不再错位。

---

## 修复后验证

重新连接服务器：

```bash
ssh dev
```

检查终端类型：

```bash
echo "$TERM"
```

检查清屏能力：

```bash
infocmp -1 "$TERM" |
  grep -E '^[[:space:]]*(clear|E3)='
```

然后依次测试：

```bash
clear
clear -x
```

再测试 `Ctrl+L`，最后缩小窗口验证长提示符的换行和重绘。

---

## 多服务器和多用户场景

用户级 terminfo 是按“远端服务器 + 远端用户”生效的。

如果有多台服务器，可以分别安装：

```bash
for host in dev dev2; do
  infocmp -x xterm-256color |
    ssh "$host" 'mkdir -p "$HOME/.terminfo" && tic -x -o "$HOME/.terminfo" -'
done
```

以下情况可能需要重新安装：

- 更换服务器；
- 更换登录用户；
- 用户主目录被重置；
- 进入拥有独立 terminfo 数据库的容器；
- `$TERM` 改成其他终端类型。

查看 terminfo 搜索路径：

```bash
infocmp -D
```

检查是否存在覆盖变量：

```bash
echo "TERMINFO=$TERMINFO"
echo "TERMINFO_DIRS=$TERMINFO_DIRS"
```

---

## 为什么不直接强制使用 `xterm-ghostty`

如果远端已经安装 `xterm-ghostty`，可以在 SSH 配置中强制：

```sshconfig
Host dev
  SetEnv TERM=xterm-ghostty
```

但这不适合作为多个终端共用的通用方案。

Ghostty 和基于 libghostty 的 cmux 可以使用 `xterm-ghostty`，但 Otty 默认使用 `xterm-256color`，并明确建议不要冒充另一种终端。错误声明终端类型可能让应用发送当前终端并不完整支持的高级序列。

因此更稳妥的做法是：

1. 保留各终端自己的 `$TERM`；
2. 修复远端对应的 terminfo；
3. 不在全局 SSH 配置中强制所有终端使用同一个 `$TERM`。

---

## macOS 旧版本注意事项

部分旧版 macOS 自带的 ncurses/`infocmp` 版本较老。如果远端 `tic` 无法识别导出的内容，可以安装新版 ncurses：

```bash
brew install ncurses
```

Apple Silicon Mac 使用：

```bash
/opt/homebrew/opt/ncurses/bin/infocmp -x xterm-256color |
  ssh dev 'mkdir -p "$HOME/.terminfo" && tic -x -o "$HOME/.terminfo" -'
```

Intel Mac 通常使用：

```bash
/usr/local/opt/ncurses/bin/infocmp -x xterm-256color |
  ssh dev 'mkdir -p "$HOME/.terminfo" && tic -x -o "$HOME/.terminfo" -'
```

---

## 快速排查清单

以后遇到 SSH 下的提示符错位、光标异常或无法清屏，可以按以下顺序检查。

### 1. 查看终端类型

```bash
echo "TERM=$TERM TERM_PROGRAM=$TERM_PROGRAM COLORTERM=$COLORTERM"
```

### 2. 检查命令是否被覆盖

```bash
type -a clear
```

### 3. 直接发送 ANSI 清屏序列

```bash
printf '\033[H\033[2J'
```

如果这条有效，而 `clear` 无效，应优先检查 terminfo。

### 4. 比较不同终端类型

```bash
TERM=xterm-256color command clear
TERM=xterm-ghostty command clear
```

### 5. 修复远端用户级 terminfo

```bash
infocmp -x xterm-256color |
  ssh dev 'mkdir -p "$HOME/.terminfo" && tic -x -o "$HOME/.terminfo" -'
```

---

## 总结

这次问题最容易误判的地方，是所有现象看起来都发生在“渲染层”：

- 光标位置不对；
- 长提示符无法换行；
- 窄窗口下文字残缺；
- `clear` 和 `Ctrl+L` 没有效果；
- Ghostty 正常，cmux/Otty 异常。

但直接发送 ANSI 序列可以正常工作，证明终端模拟器没有问题。真正的根因是 cmux/Otty 使用的 `xterm-256color` 在远端对应到了一份异常的 terminfo，而 Ghostty 使用的 `xterm-ghostty` 条目正常。

最终通过下面一条命令修复：

```bash
infocmp -x xterm-256color |
  ssh dev 'mkdir -p "$HOME/.terminfo" && tic -x -o "$HOME/.terminfo" -'
```

遇到类似问题时，不要只盯着终端渲染器。先绕过 terminfo 直接发送控制序列，再比较不同 `$TERM` 下的行为，通常可以很快判断问题究竟在终端、SSH 链路还是远端能力数据库。

---

## 参考资料

- [Ghostty：SSH](https://ghostty.org/docs/features/ssh)
- [Ghostty：Terminfo](https://ghostty.org/docs/help/terminfo)
- [Otty：$TERM and Identification](https://docs.otty.sh/terminal-features/term-value)
- [Ubuntu：clear(1)](https://manpages.ubuntu.com/manpages/jammy/man1/clear.1.html)
