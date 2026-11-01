# Cyber Wire delivery checklist

Director integration is excluded. Checked items require evidence; source changes alone do not establish real playback performance. Windows signing needs a publisher certificate/service account; Apple signing requires developer credentials.

## Stability and playback

- [ ] 1. Reproduce Clean View failures in a running current build.
- [x] 2. Verify hide/restore in the Electron renderer smoke test; live-video layouts still need comparison.
- [x] 3. Hover reveal preserves main layout dimensions (Electron smoke test); live decoder continuity remains under item 8.
- [x] 4. Pinning prevents hover reveal (Electron smoke test).
- [ ] 5. Verify Escape recovery from every layout.
- [ ] 6. Measure and fix docked versus pop-out lag.
- [x] 7. Native statistics expose dropped frames, CPU, memory and GPU decode support (support is not proof of active hardware decoding).
- [ ] 8. Preserve playback across layout changes.
- [ ] 9. Test fullscreen and Theater across playback layouts.
- [ ] 10. Distinguish resolver, network, rendition and offline failures.

## Streams and quality

- [ ] 11. Show actual quality while keeping the 720p default.
- [ ] 12. Verify independently selected higher qualities.
- [x] 13. Prefer compatible 720p renditions before higher-quality fallback (selector regression tests).
- [ ] 14. Remember channel quality choices (main-process persistence and restore implemented; restart smoke test pending).
- [ ] 15. Optional quality reduction after sustained buffering.
- [ ] 16. Optional resource-saving mode.
- [ ] 17. Pause tiles independently (per-tile pause/resume controls implemented; playback smoke test pending).
- [ ] 18. Verify independent audio across all surfaces.
- [ ] 19. Mute-all and selected-audio controls (idempotent per-tile commands implemented; audible smoke test pending).
- [ ] 20. Verify live status against real service responses.

## Layouts and pop-outs

- [ ] 21. Verify sidebar recovery in every layout.
- [ ] 22. Overlay rails without squeezing the video.
- [ ] 23. Always-visible, hover and hidden panel settings.
- [ ] 24. Separate visibility choices for every panel.
- [ ] 25. Save custom layouts.
- [ ] 26. Draggable/resizable tiles.
- [ ] 27. Main-camera and smaller-camera presets.
- [ ] 28. Saved pop-out geometry implemented; real multi-monitor verification pending.
- [ ] 29. Verify immediate docking on pop-out close (event handler implemented).
- [ ] 30. Recover safely from monitor disconnection.

## Search, accounts and chat

- [ ] 31. Signed-in and guest search on both services.
- [ ] 32. Consistent Add Stream and main search behavior.
- [ ] 33. Keep multistream open when adding channels.
- [ ] 34. Distinguish local favorites and service follows.
- [ ] 35. Public favorite identity/status where supported.
- [ ] 36. Emote rendering, autocomplete and picker verification.
- [ ] 37. Mentions and replies on both services.
- [ ] 38. Measure and reduce chat rendering overhead.
- [ ] 39. Clear connected account identities.
- [ ] 40. Expired-session recovery without disrupting viewing.

## OBS spectator workflow

- [ ] 41. OBS connection/status/test UI implemented; local protocol tests pass; real OBS connection pending.
- [ ] 42. Configurable global hotkey implemented; gaming/OBS verification pending.
- [ ] 43. Spectator switching implemented and protocol-tested; real OBS verification pending.
- [ ] 44. Existing OBS Window Capture inputs can be arranged independently; capture binding is configured in OBS.
- [x] 45. Two/grid/main-plus-small presets implemented; geometry and source-arrangement tests pass.
- [ ] 46. Source order, preset and audio selection are saved; scene transforms persist in OBS. User-session verification pending.
- [ ] 47. Previous scene restoration implemented and protocol-tested; real OBS verification pending.

## Distribution

- [ ] 48. Configure trusted Windows signing (publisher credentials required).
- [ ] 49. Intel/Apple Silicon packages and Mac updater assets configured; signing/notarization require credentials. macOS Native playback needs separately installed Streamlink.
- [ ] 50. Automated checks and isolated Electron smoke test now gate Windows releases; installed-updater/live-playback validation pending.
