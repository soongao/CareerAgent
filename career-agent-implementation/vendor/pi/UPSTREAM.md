# Pi upstream source

This project targets the upstream Pi repository:

- Repository: `https://github.com/earendil-works/pi.git`
- Pinned release for this implementation: `v0.85.1`
- License: MIT
- Official release source archive: `pi-0.85.1-source.tar.gz`
- Published SHA-256: `f7ec92ed4f7b75369198398a3421732eae405183971450bc74cb8544f42d02ca`

The development sandbox used to generate the bundled engineering traces has outbound DNS disabled, so the full third-party repository could not be physically copied into this artifact without falsely claiming it had been executed. `scripts/fetch-pi-source.sh` vendors the exact upstream tag into `vendor/pi/source/` on a networked machine and builds it. `PiRuntimeAdapter` automatically prefers that vendored build when present.

The trace campaign uses the same application `PiSessionRuntime` boundary with GPT-5.6 Sol-authored captured responses. It validates task/session lifecycle and the application semantics, but it is deliberately not labeled as execution of Pi's internal agent loop. Use `npm run validate:pi-source` after vendoring to execute the online path through the real Pi source.
