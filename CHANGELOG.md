# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-05-31

### Changed
- **Breaking**: pi runtime packages migrated from the `@mariozechner/*` scope to `@earendil-works/*`. Peer deps are now `@earendil-works/pi-ai`, `@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, with the floor raised to `>=0.74.0`. Import paths in `src/` updated accordingly.

## [0.3.0] - 2026-04-30

> Note: [pi-tasks](https://github.com/tintinweb/pi-tasks/) is the recommended successor to this extension.

### Changed
- **Breaking**: Requires pi runtime ≥ 0.70.0. Peer dep floor raised from `*` to `>=0.70.0` for `@mariozechner/pi-ai`, `@mariozechner/pi-coding-agent`, `@mariozechner/pi-tui`.
- Moved pi runtime packages from `dependencies` to `peerDependencies` (#1, thanks @tbroadley) — they're virtualized by the pi runtime, so the previous `"latest"` pins were duplicate installs and unnecessary supply-chain surface.
- Schema imports consolidated to `@mariozechner/pi-ai` (which re-exports `Type`/`Static` from `typebox` v1). Dropped direct `@sinclair/typebox` dependency.
- Session reconstruction now hooks `session_start` (covering `startup`/`reload`/`new`/`resume`/`fork`) plus `session_tree`. The removed `session_switch` and `session_fork` events are no longer emitted by pi 0.70.x — `session_start.reason` now distinguishes them.
- Bumped devDeps: TypeScript `^6.0.3`, `@types/node` `^25.6.0`.

### Added
- CI: `lint`, `typecheck`, `build`, `prepublishOnly` npm scripts; Biome config; GitHub Actions workflow running on push/PR to `master`.
- README: deprecation notice pointing to pi-tasks; updated dev commands.

## [0.2.0] - 2026-02-16

### Changed
- **Breaking**: Removed max one in-progress validation to support parallel work and subagents
- Enhanced success message to include progress stats and explicit continuation instructions
- Updated tool description to reflect support for multiple in-progress items
- Updated status description from "max 1" to "multiple allowed for parallel work"

### Added
- Small list warning when todo list has fewer than 3 items
- Progress tracking in success messages: "Todos have been modified successfully. X/Y completed"
- Explicit guidance in responses: "Ensure that you continue to use the todo list to track your progress"

### Fixed
- Validation now allows multiple todos to be in-progress simultaneously for better subagent support

## [0.1.0] - 2026-02-15

### Added
- Initial release of pi-manage-todo-list extension
- Core `manage_todo_list` tool with read/write operations
- TodoItem schema with id, title, description, and status fields
- Validation for required fields and valid status values
- Live widget showing real-time progress above editor
- Session persistence across switches, forks, and tree navigation
- Themed display with status icons (✓ completed, ◉ in-progress, ○ not-started)
- User commands: `/todos` for stats and `/todos clear` to reset
- TodoStateManager for in-memory state management
- Auto-reconstruction from session entries on reload
- Expandable tool result rendering

[0.4.0]: https://github.com/tintinweb/pi-manage-todo-list/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/tintinweb/pi-manage-todo-list/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/tintinweb/pi-manage-todo-list/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/tintinweb/pi-manage-todo-list/releases/tag/v0.1.0
