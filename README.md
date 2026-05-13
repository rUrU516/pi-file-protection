# Pi Agent File Protection / Pi Agent 文件保护

A Pi extension that protects your files and system from accidental destructive operations.

一个保护您的文件和系统免受意外破坏操作的 Pi 扩展。

<table>
<tr>
<td><img src="./screenshot-sudo.png" width="400"/></td>
<td><img src="./screenshot-git.png" width="400"/></td>
</tr>
</table>

## Features / 功能

### 🔄 Session Toggle / 会话开关 (`/protect`)

Use the `/protect` command to toggle protection on or off within the current session (default: **ON**).

使用 `/protect` 命令在当前会话中切换保护状态（默认：**开启**）。

```
/protect on    # Enable protection / 开启保护
/protect off   # Disable protection / 关闭保护
/protect       # Show current status / 显示当前状态
```

### 📢 OS Notifications / 系统通知

- **Permission requests** — macOS notification pops up when a protected operation needs your approval (✏️ for file edits, 📟 for bash commands)
- **Agent completion** — macOS notification with a summary of the last response when the agent finishes
- **Protection status** — notification content includes the specific operation details (file path, command, etc.)

- **权限请求** — 受保护操作需要确认时弹出 macOS 系统通知（✏️ 表示文件编辑，📟 表示 bash 命令）
- **Agent 完成** — agent 回复完毕后弹出 macOS 系统通知，附带回复摘要
- **保护状态** — 通知内容包含具体操作详情（文件路径、命令等）

### Git & GitHub CLI Protection / Git 与 GitHub CLI 保护
Prompts for confirmation before executing blacklisted `git` commands, and before executing any `gh` commands.
执行黑名单中的 `git` 命令前会要求确认，并且执行任何 `gh` 命令前也会要求确认。

### Delete Protection / 删除保护
Prompts for confirmation before running destructive commands like `rm`, `rmdir`, `unlink`, `mv`, or any command containing "delete" (e.g., `find -delete`, `kubectl delete`).
执行破坏性命令（如 `rm`、`rmdir`、`unlink`、`mv`）或包含 "delete" 的命令（如 `find -delete`、`kubectl delete`）前会要求确认。

### Edit Protection / 编辑保护
Prompts for confirmation before:
- Using `write` or `edit` tools
- Running bash commands like `truncate`, `sed -i`, or output redirection (`>`, `>>`)

在以下操作前会要求确认：
- 使用 `write` 或 `edit` 工具
- 运行 bash 命令如 `truncate`、`sed -i` 或输出重定向（`>`、`>>`）

### Privilege Protection / 权限保护
Prompts for confirmation before:
- Running `sudo` commands (elevated privileges)
- Setting dangerous permissions with `chmod/chown 777`

在以下操作前会要求确认：
- 运行 `sudo` 命令（提升权限）
- 使用 `chmod/chown 777` 设置危险权限

## Installation / 安装

**推荐方式 (Recommended):**
```bash
pi install npm:pi-file-protection
```

**从源码安装 (From source):**
```bash
pi install git:github.com/rUrU516/pi-file-protection
```

## Update / 更新

To get the latest features and protections:

获取最新功能和保护：

```bash
pi update
```

## Usage / 使用

Once installed, the extension automatically activates and will prompt you for confirmation before executing any protected operations.

安装后，扩展会自动激活，并在执行任何受保护的操作前提示您确认。

## License / 许可证

MIT
