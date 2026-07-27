# GitHub setup

## Repository

**Repository name:** `RewindOS`

**Description:**

> Free, private and fully local undo and recovery center for Windows and Linux. Protect selected folders, track file changes, restore deleted or modified files, create checkpoints and keep encrypted local versions — without accounts, ads or cloud requirements.

Choose **Public** if everyone should be able to download and inspect the project.

Do not let GitHub generate another README, .gitignore or license because all three are already included.

## Upload

Upload all files from this repository folder, including hidden folders such as `.github`.

The tested Windows installer can be added to `releases/windows/` or attached directly to a GitHub Release.

## Linux packages

GitHub Actions builds AppImage, DEB and RPM automatically. Open **Actions → Build RewindOS → Run workflow**. Download `RewindOS-Linux` after the build succeeds.

To publish both operating systems together, create and push the tag `v0.4.0`. The workflow builds Windows and Linux, creates checksums and attaches all generated packages to the release.
