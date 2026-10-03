# Xingsi Relay Desktop

A desktop coding and office assistant for Xingsi relay users, based on [ZCode 3.14.3](https://github.com/zai-org/ZCode). This repository provides the modified client and Agent source. The relay backend is not included.

[中文说明](README.md) · [Upstream documentation](README.upstream.en.md)

Features include relay account login with automatic model configuration, mandatory login on startup, remaining subscription quota with manual refresh, coding/office mode selection, custom branding, and the assistant identity “星思中转助手”.

```bash
git clone https://github.com/wangxin-ux/xingsi-relay-desktop.git
cd xingsi-relay-desktop
pnpm bootstrap
pnpm dev:desktop
```

Use Node.js 24.14.0 and pnpm 10.33.2. The default endpoint is `https://xing.xinxinyuntu.top`; users need their own valid relay account. No administrator credentials, API keys, or user data are bundled. Other relay architectures require adapting their API contracts.

See the Chinese README for build and test commands. Agent changes require rebuilding the Agent runtime. This publication contains development source; no installer was rebuilt or published in this upload.

Licensed under [Apache-2.0](LICENSE). Attribution and third-party notices remain in [NOTICE.md](NOTICE.md) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). This is an independently maintained modification, not an official upstream release.
