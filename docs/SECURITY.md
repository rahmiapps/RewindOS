# Security and data safety

RewindOS is local-first. The sandboxed renderer has no Node access and no general network client. Update checking is disabled by default and can only be triggered through the privileged main process.

## Recommended test procedure

1. Start with a new empty disposable folder.
2. Add it through the native folder chooser.
3. Create, edit, copy, rename, move and delete sample files.
4. Use undo preview, dry-run and test restore before destructive recovery.
5. Verify restored copies and safety versions before using important folders.
6. Keep an independent backup; RewindOS is an additional recovery layer.

## Encryption key

The local master key uses Electron Safe Storage when a strong operating-system backend is available. Otherwise RewindOS uses restrictive local file permissions and reports the weaker condition in Diagnostics. A passphrase-protected recovery bundle is required to move an encrypted vault to another installation.

## Ransomware wording

The mass-change detector is an early-warning, pause and emergency-snapshot feature. It is not a kernel filter, antivirus product or guaranteed process blocker.

## Restore boundary

A destructive restore is allowed only inside a currently protected/project root or at a destination explicitly selected by the user. RewindOS application-data directories, symlinks and special files are not valid restore targets.
