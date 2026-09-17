# WiredScythe

WiredScythe is a red-and-black Windows desktop viewer for Twitch and Kick, with single-stream and multistream layouts.

## Features

- Watch public Twitch and Kick streams without signing in
- Search Twitch and Kick channels from Browse or Multistream
- Watch up to nine streams together
- Optional account sign-in for followed channels and account-aware features
- Automatic updates from GitHub Releases

## Install

Download the newest Windows installer from this repository's **Releases** page. Windows may display a SmartScreen warning until the project has a trusted code-signing certificate.

## Development

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

## Publishing an update

1. Update the version in `package.json` and `package-lock.json`.
2. Add the release notes to `CHANGELOG.md`.
3. Commit and push the change.
4. Tag that commit with the matching version, such as `v0.3.4-alpha.19`, and push the tag.

GitHub Actions builds the installer, publishes the release files, and produces the metadata used by the in-app updater. Installed copies then receive the update automatically.

Optional Windows signing secrets are `WINDOWS_CSC_LINK`, `WINDOWS_CSC_KEY_PASSWORD`, and `WINDOWS_PUBLISHER_NAME`.

## Privacy

Guest viewing does not require a WiredScythe account. Twitch or Kick sign-in is optional and is handled through those services.

## License

WiredScythe is distributed under the GNU General Public License v3.0 or later. See `LICENSE`, `NOTICE.md`, and `THIRD_PARTY_NOTICES.md`.
