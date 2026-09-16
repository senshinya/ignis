---
title: Updating
description: Update Ignis and the pinned Obsidian version.
---

## Update Ignis

From your compose directory, pull the latest image and recreate the container:

```bash
docker compose pull
docker compose up -d
```

Your vaults, data, and settings are untouched. If the new image pins a different Obsidian version, the container will download the new version on startup. The [Changelog](/docs/changelog/) lists what each release includes.

## Obsidian version

Each Ignis release pins a known-good Obsidian version, since an Obsidian release can include changes that break the shim. Updating Ignis moves you to the version pinned by that release.

Obsidian 1.13 and later require the server operator to accept Obsidian's terms statement before they start. When an update moves you to one of these versions, read the statement in [Obsidian terms](/docs/server/environment/#obsidian-terms) and, if you agree, add `OBSIDIAN_ACCEPT_TERMS=true` to the compose environment before recreating the container.

To try a newer Obsidian before the shim has been updated, set `OBSIDIAN_VERSION` in the compose environment. It is downloaded on the next start, with no guarantee that Ignis will run correctly.
