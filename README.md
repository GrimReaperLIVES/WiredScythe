<p align="center">
  <img src="build/wiredscythe-icon.png" alt="WiredScythe" width="160">
</p>

<h1 align="center">WiredScythe</h1>

<p align="center">
  A red-and-black Windows viewer for Twitch and Kick with guest playback and multistream.
</p>

<p align="center">
  <a href="https://github.com/GrimReaperLIVES/WiredScythe/releases/latest/download/WiredScythe-Setup-x64.exe">
    <img alt="Download WiredScythe for Windows" src="https://img.shields.io/badge/DOWNLOAD-WIREDScythe_for_Windows-e11d2e?style=for-the-badge&logo=windows&logoColor=white">
  </a>
</p>

<p align="center">
  <strong>One installer. No WiredScythe account required.</strong>
</p>

## Watch your way

- Watch public Twitch and Kick streams without signing in
- Search either service from Browse or Multistream
- Watch up to nine complete, uncropped streams together
- Use fullscreen clean view to hide the interface and chat
- Sign in only when you want followed channels or account-aware features
- Receive future releases through automatic updates

## Install

Click the large **DOWNLOAD** button above and run `WiredScythe-Setup-x64.exe`.

Windows may display a SmartScreen warning until the project has a trusted code-signing certificate.

<details>
<summary><strong>Source code and development</strong></summary>

Requirements: Node.js 22 and npm.

```powershell
npm ci
npm run dev
```

Run the checks with:

```powershell
npm run lint
npm test
```

To publish an update, update the version in `package.json` and `package-lock.json`, add the release to `CHANGELOG.md`, and push a matching version tag. GitHub Actions builds the installer and automatic-update metadata.

Optional Windows signing secrets are `WINDOWS_CSC_LINK`, `WINDOWS_CSC_KEY_PASSWORD`, and `WINDOWS_PUBLISHER_NAME`.

</details>

## Privacy

Guest viewing does not require a WiredScythe account. Twitch or Kick sign-in is optional and handled through those services.

## License

Copyright (c) 2026 Grim. All rights reserved.

WiredScythe is proprietary software. The public source is provided for
visibility only and may not be copied, modified, redistributed, repackaged,
or used in another product without Grim's prior written permission. Official,
unmodified installers may be downloaded and run for personal use. See
`LICENSE` and `THIRD_PARTY_NOTICES.md` for the complete terms and the separate
licenses that continue to apply to third-party components.
