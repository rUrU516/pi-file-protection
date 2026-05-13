# Pi Shield

A Pi extension that asks for confirmation before risky file, git, bash, and privilege operations.

## Install

```bash
pi install npm:pi-shield
```

## Commands

```bash
/shield
/shield on
/shield off
/shield default on
/shield default off
/shield notifications on
/shield notifications off
```

- `/shield` opens the settings panel.
- `/shield on/off` changes the current session only.
- `/shield default on/off` changes the default for future sessions.
- `/shield notifications on/off` toggles macOS notifications globally.

## Shortcut

```text
Ctrl+Shift+S
```

Toggles the shield for the current session.

## What it protects

- `write` and `edit` tool calls
- destructive bash commands like `rm`, `mv`, `delete`
- risky git / GitHub CLI commands
- privilege commands like `sudo` and `chmod 777`

## UI

Shield status is shown in the editor border:

```text
[ shield on  ]
[ shield off ]
```

macOS notifications are shown for permission requests and agent completion. They can be disabled from `/shield` or with `/shield notifications off`.

## Config

Default shield state is stored at:

```text
~/.pi/agent/pi-shield.json
```

## License

MIT
