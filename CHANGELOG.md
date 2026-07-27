# Changelog

## 0.4.0 – 2026-07-25

- removed the explanatory subtitles below the German and English first-run language cards
- replaced bright native-looking scrollbars with compact theme-aware scrollbars throughout the app
- made select controls and their option lists follow the dark or light application theme
- changed backup-storage display to show the complete wrapping path instead of clipping it
- added editable global shortcuts with key capture, duplicate detection, reset-to-default and explicit saving
- moved recent dashboard activity into a responsive popup to reduce page scrolling
- prevented the safety-status card from stretching into unused blank space
- added large-text reflow for sidebar, cards, controls, lists and modal footers
- changed Undo Preview so Restore performs a real restore; test restoration is now a separate action
- show original file names and complete paths for filesystem activity and deletion recovery
- added protected-trash results to natural-language search, including “heute gelöschte Bilder”
- added direct restoration of protected-trash search results to their original folder
- require at least one protected folder during first-run setup while monitoring is enabled
- added guidance when a deletion cannot be found because no source folder was protected beforehand
- expanded the automated suite to 77 tests while retaining 49 executable-code requirement checks

## 0.3.0 – 2026-07-25

- rebuilt the deliverable as a complete source tree instead of documentation-only output
- corrected electron-builder to the published pinned version 26.15.3
- added strict vault, checkpoint, trash and recovery-metadata normalization
- added decompression, JSON, manifest, count and size limits for untrusted imports
- changed recovery import to private staging, full verification, transactional swap and rollback
- restricted destructive restores to watched/project roots or explicit user-selected destinations
- blocked restores into RewindOS application data and rejected symlink/special-file replacement paths
- preserved existing targets as safety versions or protected-trash entries before replacement
- hardened cross-device moves and directory recovery against symlink traversal
- added single-use confirmation tokens for Explorer and Linux file-manager requests
- added install/status/remove controls for Explorer, Nautilus, Nemo and Dolphin integration
- added per-user NSIS Explorer registration and reliable uninstall cleanup
- enforced Linux graphical smoke tests and regular-file-only checksums
- expanded renderer escaping, dynamic CSS sanitization and Electron sandbox restrictions
- added scheduler, mirror, gaming, battery and restore-authorization regression coverage
- expanded automated verification to 73 tests and 49 executable-code requirement checks

## 0.2.0 – 2026-07-25

- completed multi-step first-run setup
- added secure path grants, IPC limits and stricter import validation
- encrypted clipboard images and workspace screenshots
- added true selective checkpoints and complete directory recovery
- added test restore, version preview, target selection and conflict controls
- enforced undo, mass-action, retention, power and mirror settings
- added project folders to workspace capture/restore
- added complete timeline filters and expanded statistics
- hardened Electron sandbox/CSP and process identity checks
- added CI, CodeQL, Dependabot, audit/smoke gates and checksums

## 0.1.0

- initial source prototype
