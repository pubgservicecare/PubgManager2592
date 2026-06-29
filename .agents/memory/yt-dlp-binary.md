---
name: yt-dlp binary on Replit
description: Which yt-dlp GitHub release to download on Replit NixOS — and why the default one silently fails.
---

## Rule
Always download `yt-dlp_linux` (the PyInstaller standalone build), never the plain `yt-dlp` release.

**URL:**
```
https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux
```

**Why:**
The default `yt-dlp` release is a Python zipapp with a `#!/usr/bin/env python3` shebang. Replit's NixOS containers do not have `python3` in PATH, so every invocation fails with:
```
/usr/bin/env: 'python3': No such file or directory
```
This surfaces as a generic HTTP 500 to the browser. The error is NOT obvious — it looks like a network or YouTube block.

`yt-dlp_linux` is compiled with PyInstaller and ships its own Python runtime — zero host Python needed.

**How to apply:**
- `YT_DLP_URL` in `artifacts/api-server/src/lib/ytDownloader.ts` must point to `yt-dlp_linux`.
- If the cached binary at `.cache/yt-dlp` was downloaded from the wrong URL, delete it (`rm .cache/yt-dlp`) and restart — it will re-download from the corrected URL.
- ffmpeg 6.1.2 is available system-wide at `/nix/store/.../ffmpeg` — no install needed for video+audio merging.
