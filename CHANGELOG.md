## [0.6.1](https://github.com/Doist/comms-sdk-typescript/compare/v0.6.0...v0.6.1) (2026-06-25)

### Bug Fixes

* **deps:** resolve Dependabot vulnerabilities ([#39](https://github.com/Doist/comms-sdk-typescript/issues/39)) ([953f6d8](https://github.com/Doist/comms-sdk-typescript/commit/953f6d83ef27150ee2a17369a2cf76585099f454))

## [0.6.0](https://github.com/Doist/comms-sdk-typescript/compare/v0.5.2...v0.6.0) (2026-06-25)

### Features

* add REST hooks client ([#41](https://github.com/Doist/comms-sdk-typescript/issues/41)) ([70be73a](https://github.com/Doist/comms-sdk-typescript/commit/70be73a6f0f644115e517447928da82c32ccc666))

## [0.5.2](https://github.com/Doist/comms-sdk-typescript/compare/v0.5.1...v0.5.2) (2026-06-19)

### Bug Fixes

* align thread mark_read/unread and group user endpoints with the backend ([#38](https://github.com/Doist/comms-sdk-typescript/issues/38)) ([2e6cffa](https://github.com/Doist/comms-sdk-typescript/commit/2e6cffa8926f45af00f998782c9a2e7475684b1f))

## [0.5.1](https://github.com/Doist/comms-sdk-typescript/compare/v0.5.0...v0.5.1) (2026-06-18)

### Bug Fixes

* **auth:** Support public client token refresh ([#36](https://github.com/Doist/comms-sdk-typescript/issues/36)) ([ba408a8](https://github.com/Doist/comms-sdk-typescript/commit/ba408a89f55475ef30e7bd5a3d0abddc73fb8f6d))

## [0.5.0](https://github.com/Doist/comms-sdk-typescript/compare/v0.4.6...v0.5.0) (2026-06-18)

### Features

* add refreshAuthToken + point OAuth at the Todoist authorization server ([#29](https://github.com/Doist/comms-sdk-typescript/issues/29)) ([bd169f9](https://github.com/Doist/comms-sdk-typescript/commit/bd169f9b4c39506b0c4c8081b0289c002bd8d040))

## [0.4.6](https://github.com/Doist/comms-sdk-typescript/compare/v0.4.5...v0.4.6) (2026-06-15)

### Bug Fixes

* **urls:** drop legacy /a/ prefix from Comms permalinks ([#27](https://github.com/Doist/comms-sdk-typescript/issues/27)) ([37ee9d0](https://github.com/Doist/comms-sdk-typescript/commit/37ee9d02b2a66ca34644e58e10b267171deb14e6))

## [0.4.5](https://github.com/Doist/comms-sdk-typescript/compare/v0.4.4...v0.4.5) (2026-06-15)

### Bug Fixes

* parse bare comment object from comments/getone ([#26](https://github.com/Doist/comms-sdk-typescript/issues/26)) ([f738991](https://github.com/Doist/comms-sdk-typescript/commit/f738991dfb906caf92f69b9efbaab6241b1f0d38))

## [0.4.4](https://github.com/Doist/comms-sdk-typescript/compare/v0.4.3...v0.4.4) (2026-06-15)

### Bug Fixes

* expose pinned timestamp as pinnedDate ([#24](https://github.com/Doist/comms-sdk-typescript/issues/24)) ([41f0074](https://github.com/Doist/comms-sdk-typescript/commit/41f00744f0d7a14ecadf250a2f4b2011c18a42eb))

## [0.4.3](https://github.com/Doist/comms-sdk-typescript/compare/v0.4.2...v0.4.3) (2026-06-09)

### Bug Fixes

* build a working dispatcher on runtimes without undici's decompress interceptor (e.g. Bun) ([#20](https://github.com/Doist/comms-sdk-typescript/issues/20)) ([e415e07](https://github.com/Doist/comms-sdk-typescript/commit/e415e07539d27c00c07dbe70e767025d28964742))

## [0.4.2](https://github.com/Doist/comms-sdk-typescript/compare/v0.4.1...v0.4.2) (2026-06-08)

### Bug Fixes

* pin undici to 7.24.8 and block renovate updates ([#18](https://github.com/Doist/comms-sdk-typescript/issues/18)) ([874de5a](https://github.com/Doist/comms-sdk-typescript/commit/874de5a1b2633c0db2b9a803baf1651a170ed7a3))

## [0.4.1](https://github.com/Doist/comms-sdk-typescript/compare/v0.4.0...v0.4.1) (2026-05-31)

### Bug Fixes

* **threads:** accept attachments when creating a thread ([#16](https://github.com/Doist/comms-sdk-typescript/issues/16)) ([f4e862b](https://github.com/Doist/comms-sdk-typescript/commit/f4e862b36d915d89c07ef74fe9136254de8aaaec)), closes [Doist/twist-sdk-typescript#142](https://github.com/Doist/twist-sdk-typescript/issues/142) [twist-sdk#142](https://github.com/Doist/twist-sdk/issues/142)

## [0.4.0](https://github.com/Doist/comms-sdk-typescript/compare/v0.3.0...v0.4.0) (2026-05-31)

### Features

* **attachments:** add client for uploading file attachments ([#15](https://github.com/Doist/comms-sdk-typescript/issues/15)) ([87e49c4](https://github.com/Doist/comms-sdk-typescript/commit/87e49c437e91126a1042470ce53d5a517ff06213))

## [0.3.0](https://github.com/Doist/comms-sdk-typescript/compare/v0.2.1...v0.3.0) (2026-05-28)

### Features

* **workspace-users:** exclude removed users by default ([#13](https://github.com/Doist/comms-sdk-typescript/issues/13)) ([a3904c6](https://github.com/Doist/comms-sdk-typescript/commit/a3904c6637a5133dfc86e64e4d0d7456012592e8))

## [0.2.1](https://github.com/Doist/comms-sdk-typescript/compare/v0.2.0...v0.2.1) (2026-05-22)

### Bug Fixes

* **entities:** honor configured baseUrl in entity links ([#10](https://github.com/Doist/comms-sdk-typescript/issues/10)) ([024d9cb](https://github.com/Doist/comms-sdk-typescript/commit/024d9cbd40637f7feb0ad1bf2d1fda382599da88))

## [0.2.0](https://github.com/Doist/comms-sdk-typescript/compare/v0.1.1...v0.2.0) (2026-05-21)

### Features

* Update README to trigger release ([#9](https://github.com/Doist/comms-sdk-typescript/issues/9)) ([8cfa533](https://github.com/Doist/comms-sdk-typescript/commit/8cfa533c4a36ea461806ee8c278f78268b196aec))

## [0.1.1](https://github.com/Doist/comms-sdk-typescript/compare/v0.1.0...v0.1.1) (2026-05-21)

### Bug Fixes

* Update README title for clarity ([#8](https://github.com/Doist/comms-sdk-typescript/issues/8)) ([a932dce](https://github.com/Doist/comms-sdk-typescript/commit/a932dce202db2f1e62f6664bbb8932583367cd64))
