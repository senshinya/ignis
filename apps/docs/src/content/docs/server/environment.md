---
title: Environment variables
description: Every variable the server reads, with its default.
---

Configure the server through environment variables, set in the `environment:` block of your compose file. For runtime configurable values see [Settings](/docs/using/settings/).

## Core

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8080` | Port the server listens on. |
| `VAULT_ROOT` | `/vaults` | Directory holding your vaults, one sub-folder per vault. |
| `DATA_ROOT` | `/app/data` | Directory for Ignis state: server plugin config, sync state, and tokens. |

## Obsidian

| Variable | Default | Description |
| --- | --- | --- |
| `OBSIDIAN_VERSION` | `1.13.7` | Obsidian version fetched on first run. Each release pins a known-good version. |
| `OBSIDIAN_PACKAGE` | unset | Path to a pre-placed Obsidian package (`.deb`, `.asar.gz`, or `.asar`) to unpack instead of downloading, for offline installs. |
| `OBSIDIAN_ACCEPT_TERMS` | unset | Set to `true` to accept Obsidian's terms statement, which Obsidian 1.13 and later require before they start. See [Obsidian terms](#obsidian-terms). |
| `OBSIDIAN_ASSETS_PATH` | `/app/obsidian-app` | Where the extracted Obsidian files live. Point it at a pre-extracted directory to skip the download. |

### Obsidian terms

Starting with 1.13, Obsidian asks the program hosting it to confirm the following statement, and does not start otherwise:

> I understand and agree that I am not allowed to distribute the Obsidian application, in any form, without explicit approval from the Obsidian team. I also understand that Obsidian is a registered trademark, and I cannot use it without explicit permission granted by the Obsidian team.

Ignis does not confirm this on your behalf. If you run the server and agree to the statement, set `OBSIDIAN_ACCEPT_TERMS=true`:

```yaml
    environment:
      - OBSIDIAN_ACCEPT_TERMS=true
```

Without it, the browser shows the statement and these instructions instead of opening the vault, and the container log prints a warning on startup. Obsidian versions before 1.13 do not ask, so the setting has no effect on them.

## File ownership

| Variable | Default | Description |
| --- | --- | --- |
| `PUID` | `1000` | User ID that owns the files Ignis writes. |
| `PGID` | `1000` | Group ID that owns the files Ignis writes. |

## Networking and security

| Variable | Default | Description |
| --- | --- | --- |
| `WS_ORIGINS` | unset | Comma-separated allowlist of `Origin` values (with scheme) matched exactly against the browser's request. Any origin is accepted when unset. |
| `PROXY_ALLOW_PRIVATE_HOSTS` | unset | Comma-separated IPs or IPv4 CIDRs the cross-origin proxy may reach despite its private-address block. When unset, the proxy reaches no private host. Reopens SSRF to the listed targets. |

For example:

```yaml
    environment:
      - WS_ORIGINS=https://ignis.example.com
      - PROXY_ALLOW_PRIVATE_HOSTS=192.168.1.10,10.0.0.0/24
```

## Startup and performance

| Variable | Default | Description |
| --- | --- | --- |
| `AUTO_CREATE_DEFAULT` | `false` | Create a "My Vault" vault on startup when none exist. |
| `WRITE_COALESCE_MS` | `0` | Debounce window in milliseconds for rapid writes. Raise it on slow filesystems such as rclone, NFS, or SMB. Max 60000. |
| `UV_THREADPOOL_SIZE` | `4` | Node variable controlling how many file operations Ignis can run concurrently. Raising it helps with large vaults on network filesystems. |

---

Demo mode adds its own `DEMO_*` variables for running a public, throwaway instance. See [`examples/demo/`](https://github.com/Nystik-gh/ignis/tree/main/apps/ignis-server/examples/demo) in the repository.
