# Security Policy

## Supported version

Security fixes are applied to the newest RewindOS source release. The current reviewed source line is 0.3.x.

## Reporting a vulnerability

Do not publish exploitable details in a public issue. Contact the repository owner privately through the security-reporting method configured on the GitHub repository. Include the affected version, operating system, reproduction steps, impact and a minimal proof of concept.

Do not test against other people's systems or data. Use only disposable local test folders and accounts you control.

## Scope

In scope: unauthorized local file access, path traversal, symlink escapes, IPC boundary bypasses, recovery-bundle tampering, decompression/resource exhaustion, key exposure, unsafe restore destinations, unsafe process control and installer integration cleanup.

RewindOS is not an antivirus product, a kernel-level ransomware blocker or a replacement for independent backups.

## Disclosure expectation

Allow the maintainer reasonable time to investigate and publish a fix before public disclosure. Never include real user files, secrets or recovery keys in a report.
