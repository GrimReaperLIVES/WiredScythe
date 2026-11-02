<p align="center">
  <img src="build/wiredscythe-icon.png" alt="Cyber Wire" width="160">
</p>

<h1 align="center">Cyber Wire</h1>

<p align="center">
  A red-and-black Twitch and Kick viewer for Windows and macOS with guest playback and multistream.
</p>

<p align="center">
  <a href="https://github.com/GrimReaperLIVES/WiredScythe/releases/latest/download/CyberWire-Setup-x64.exe">
    <img alt="Download Cyber Wire for Windows" src="https://img.shields.io/badge/DOWNLOAD-WIREDScythe_for_Windows-e11d2e?style=for-the-badge&logo=windows&logoColor=white">
  </a>
  <a href="https://github.com/GrimReaperLIVES/WiredScythe/releases/latest">
    <img alt="Download Cyber Wire for macOS" src="https://img.shields.io/badge/DOWNLOAD-WIREDScythe_for_macOS-b91c1c?style=for-the-badge&logo=apple&logoColor=white">
  </a>
</p>

<p align="center">
  <strong>One installer. No Cyber Wire account required.</strong>
</p>

## Watch your way

Current changes and their validation are recorded in [the changelog](CHANGELOG.md). See [the 50-item follow-up audit](AUDIT.md) for remaining gaps and checks. Version alpha.44 adds followed-service filter and pop-out window fixes to the stream close, sidebar visibility and chat overlay improvements.

- Watch public Twitch and Kick streams without signing in
- Search either service from Browse or Multistream
- Watch up to nine complete, uncropped streams together
- Use Theater or fullscreen clean view without interrupting active video
- Pop out one or all streams into independent, resizable 16:9 picture-in-picture windows
- Hide Multistream chat to give the video grid the full available width
- Sign in only when you want followed channels or account-aware features
- Receive future releases through automatic updates

## Latest updates

### v0.3.4-alpha.45

- Kick chat answers keepalive pings, confirms subscriptions and reconnects automatically when its connection stops responding.
- Added connection lifecycle regression checks; this does not establish long-duration live service reliability.

### v0.3.4-alpha.44

- Correct Twitch/Kick/Both favorite filtering, per-service empty states, separate row identities and service labels.
- Sidebar scroll resets when switching service; pop-out open/close bookkeeping updates immediately.
- Desktop checks cover two pop-outs, tile sizing and docking. 349 regression tests pass.

### v0.3.4-alpha.43

- Explicit Close stream and Exit view controls, visible followed channels with manual minimize, and saved custom layouts.
- Chat overlay show/dock and hover recovery fixes, with visible overlay hide/dock controls.
- Build, 346 unit tests and isolated desktop UI checks passed; live service behavior still needs verification where noted in the audit.

### v0.3.4-alpha.42

Settings now includes **OBS Spectator**. Enable OBS's WebSocket server, enter its local port/password, and connect. Choose a spectator scene or prepare one from existing OBS capture inputs. The default hotkey is **Ctrl+Shift+F9**; pressing it again returns to the previous gameplay scene. Camera presets preserve the complete frame. Applying audio choices changes the selected OBS inputs' mute states wherever those inputs are used.

To capture each streamer separately, pop out the streams in Cyber Wire and create an OBS Window Capture input for each window. Select those inputs in OBS Spectator, choose a camera layout, and click **Apply camera layout in OBS**. This prepares the layout without switching your broadcast scene. The OBS password is kept only in memory for the session.

This update also includes remembered stream quality, bulk audio controls, pause/resume per tile, saved pop-out placement, Clean View fixes, and failure-preserving Kick status updates. Native player statistics show CPU, memory and GPU decode support to help diagnose playback issues.

Mac downloads are labeled **x64** for Intel and **arm64** for Apple Silicon. Native playback on macOS currently requires a separate Streamlink installation; Homebrew locations are detected automatically. The Mac packages remain unsigned pending Apple credentials.

### v0.3.4-alpha.40

- Cyber Wire installers retain existing settings and account sessions.
- Clean View reclaims hidden panel space, reveals navigation at the top edge, and offers a pin lock plus Escape to exit.
- Appearance settings can enable Clean View automatically when watching.
- Docked video now resynchronizes after sidebar and Clean View changes and uses an isolated rendering surface.
- Local favorites without live data are labeled status unknown.
- Balanced playback is the new-install default. Quality remains independently selectable per stream, including resolutions above 720p when offered by the channel.
- Windows and macOS release package paths are aligned. Director integration is excluded.

### v0.3.4-alpha.37

- Kick channel names and login matching now work correctly for guest viewers.
- The collapsed followed-channel rail expands on hover so channel names and navigation stay readable.
- Multistream audio is independent per stream: select, mute, or unmute each tile without changing the others.
- New playback defaults to 720p to reduce CPU and VRAM use, while every stream keeps its own quality selector.
- Channel actions use clearer Cyber Wire icons and red-and-black styling.

## Install

Click the large **DOWNLOAD** button above and run `CyberWire-Setup-x64.exe`.

Mac users can use the separate macOS button above, then choose the `.dmg` or `.zip` package for their Mac from the release page.

Windows may display a SmartScreen warning until the project has a trusted code-signing certificate.

The macOS package is currently unsigned while Apple Developer signing credentials are being set up. macOS may require you to approve it in Privacy & Security on first launch. The app is open-source for review; signed and notarized macOS packages will be published once the credentials are configured.

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

Guest viewing does not require a Cyber Wire account. Twitch or Kick sign-in is optional and handled through those services.

## License

Copyright (c) 2026 Grim. All rights reserved.

Cyber Wire is proprietary software. The public source is provided for
visibility only and may not be copied, modified, redistributed, repackaged,
or used in another product without Grim's prior written permission. Official,
unmodified installers may be downloaded and run for personal use. See
`LICENSE` and `THIRD_PARTY_NOTICES.md` for the complete terms and the separate
licenses that continue to apply to third-party components.
