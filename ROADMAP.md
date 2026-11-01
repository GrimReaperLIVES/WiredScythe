# Cyber Wire delivery checklist

Director integration is excluded. Checked items require evidence; source changes alone do not establish real playback performance. Windows signing needs a publisher certificate/service account; Apple signing requires developer credentials.

## Stability and playback

- [ ] 1. Reproduce Clean View failures in a running current build.
- [ ] 2. Verify reliable hide and restore (hover hit-area fix implemented).
- [ ] 3. Reveal overlays without video resize/restart.
- [ ] 4. Verify pin/unpin behavior.
- [ ] 5. Verify Escape recovery from every layout.
- [ ] 6. Measure and fix docked versus pop-out lag.
- [ ] 7. Collect GPU decoding and dropped-frame diagnostics.
- [ ] 8. Preserve playback across layout changes.
- [ ] 9. Test fullscreen and Theater across playback layouts.
- [ ] 10. Distinguish resolver, network, rendition and offline failures.

## Streams and quality

- [ ] 11. Show actual quality while keeping the 720p default.
- [ ] 12. Verify independently selected higher qualities.
- [ ] 13. Prefer compatible 720p renditions before higher-quality fallback.
- [ ] 14. Remember channel quality choices.
- [ ] 15. Optional quality reduction after sustained buffering.
- [ ] 16. Optional resource-saving mode.
- [ ] 17. Pause tiles independently.
- [ ] 18. Verify independent audio across all surfaces.
- [ ] 19. Mute-all and selected-audio controls.
- [ ] 20. Verify live status against real service responses.

## Layouts and pop-outs

- [ ] 21. Verify sidebar recovery in every layout.
- [ ] 22. Overlay rails without squeezing the video.
- [ ] 23. Always-visible, hover and hidden panel settings.
- [ ] 24. Separate visibility choices for every panel.
- [ ] 25. Save custom layouts.
- [ ] 26. Draggable/resizable tiles.
- [ ] 27. Main-camera and smaller-camera presets.
- [ ] 28. Save pop-out geometry.
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

- [ ] 41. OBS connection settings, status and test action.
- [ ] 42. Configurable Spectator Mode hotkey.
- [ ] 43. Switch from gameplay to a saved spectator scene.
- [ ] 44. One independently arranged capture source per stream.
- [ ] 45. Two, four and main-plus-small camera presets.
- [ ] 46. Persist selected streamers, geometry and audio choices.
- [ ] 47. Restore the previous OBS scene with the same action.

## Distribution

- [ ] 48. Configure trusted Windows signing (publisher credentials required).
- [ ] 49. Apple signing/notarization and architecture-specific packages.
- [ ] 50. Automated checks plus installed-app and updater smoke tests before releases.
