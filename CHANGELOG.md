# Changelog

All notable WiredScythe changes are documented here.

## [0.3.4-alpha.26] - 2026-09-17

### Fixes

- Fixed empty release cards in the in-app What's New panel.
- Added support for both categorized changelog sections and simple release-note bullet lists.
- Added automated coverage to prevent packaged release notes from silently disappearing again.

## [0.3.4-alpha.25] - 2026-09-16

- Fixed black video in Multistream Theater and Fullscreen by keeping the video grid in the active layout row.
- Removed the fixed-position compositor layer that could collapse active video elements to zero height.
- Verified Theater and Fullscreen against the packaged renderer with active 1920×1080 playback and advancing decoded frames.

## [0.3.4-alpha.24] - 2026-09-16

- Added Pop out all and Dock all controls for Multistream.
- Made every stream pop-out a resizable, always-on-top 16:9 picture-in-picture window.

## [0.3.4-alpha.23] - 2026-09-16

- Fixed Multistream Fullscreen and Theater viewport takeover.
- Packaged the latest Multistream layout, pop-out, and chat visibility changes into a new installer.

## [0.3.4-alpha.22] - 2026-09-16

- Restored true 16:9 playback in the full-width top/bottom two-stream layout.
- Added individually resizable 16:9 stream pop-out windows that dock again when closed.
- Added a Show/Hide chat control so streams can reclaim the full window width.
- Fixed Multistream fullscreen so the video grid reliably owns the complete display.
- Made multistream fullscreen a clean video-only mode that hides chat, application chrome, labels, and controls.
- Protected the `main` branch against direct commits, force pushes, and deletion.
- Marked original WiredScythe code and artwork as proprietary and all rights reserved by Grim.

## [0.3.4-alpha.21] - 2026-09-16

- Recentered the WiredScythe artwork and corrected logo framing throughout the application.

## [0.3.4-alpha.20] - 2026-09-16

- Added a prominent, permanent direct-download link for the Windows installer.
- Fixed multistream video cropping so the complete Twitch or Kick frame remains visible.
- Added a clean fullscreen view that hides application chrome, chat, labels, and controls.
- Added a hidden product-design signature for Grim.

## [0.3.4-alpha.19] - 2026-09-16

- Rebuilt the application as WiredScythe with a red-and-black interface.
- Added guest Twitch and Kick playback without requiring sign-in.
- Added Twitch and Kick channel search to Browse and Multistream.
- Added an explicit service selector and live suggestions when adding streams.
- Added responsive layouts for up to nine simultaneous streams.
- Added the WiredScythe logo and Windows application identity.
- Added GitHub Release publishing and automatic application updates.
