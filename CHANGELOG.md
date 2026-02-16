# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.0]: https://github.com/tintinweb/pi-manage-todo-list/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/tintinweb/pi-manage-todo-list/releases/tag/v0.1.0
