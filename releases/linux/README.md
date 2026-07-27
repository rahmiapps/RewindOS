# Linux release files

Linux packages are built automatically by GitHub Actions from the same source code.

Generated files:
- RewindOS-0.4.0.AppImage
- rewindos_0.4.0_amd64.deb
- rewindos-0.4.0.x86_64.rpm
- SHA256SUMS-Linux.txt

## Build on GitHub

1. Upload the complete repository to GitHub.
2. Open **Actions**.
3. Select **Build RewindOS**.
4. Choose **Run workflow**.
5. Wait until the Windows and Linux jobs finish.
6. Download the artifact **RewindOS-Linux**.

A tag such as `v0.4.0` automatically creates a GitHub Release and attaches the generated Windows and Linux packages.
