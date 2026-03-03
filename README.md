# Pi File Protection / Pi 文件保护

A Pi extension that protects your files and system from accidental destructive operations.

一个保护您的文件和系统免受意外破坏操作的 Pi 扩展。

## Features / 功能

### Git Protection / Git 保护
Prompts for confirmation before executing any `git` commands.
执行任何 `git` 命令前会要求确认。

### Delete Protection / 删除保护
Prompts for confirmation before running destructive commands like `rm`, `rmdir`, `unlink`.
执行破坏性命令（如 `rm`、`rmdir`、`unlink`）前会要求确认。

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

```bash
pi install github.com/rUrU516/pi-file-protection
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
