# RewindOS user guide

## Important: protect a folder first

RewindOS does not scan the complete computer or the Windows recycle bin automatically. This is intentional for privacy and safety.

Before RewindOS can reliably show or restore a deleted or modified file:

1. Open RewindOS.
2. Select **Protect folder**.
3. Choose the folder containing the files you want to protect, for example Pictures, Documents, Desktop or a project folder.
4. Wait until the initial protected versions have been created.
5. From that point on, changes in this folder appear in **Activity timeline** with the file name, original path, date, time, action and program when available.

## Deleted files

When a protected file is deleted, RewindOS records the deletion and keeps its protected version. Open **Activity timeline** or **Protected trash**, filter by **Deleted**, and select **Restore** to return it to its original folder.

The smart search also understands queries such as:

- `images deleted today`
- `Bilder heute gelöscht`
- `files changed yesterday`

A file deleted before its folder was protected cannot be recovered retroactively by RewindOS. It may still be available in the operating system recycle bin.

## Modified files

RewindOS stores protected versions of modified files. Open **File versions**, select the file and preview, compare, test-restore or restore an earlier version.

## Checkpoints

A checkpoint can preserve selected file versions, folder structure, settings, clipboard data, workspace details and supported system state. Use checkpoints before major updates, reorganizations or project changes.
