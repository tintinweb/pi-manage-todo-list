# pi-manage-todo-list

A [Pi](https://pi.dev) extension that replicates VSCode Copilot Chat `manage_todo_list` tool. Track multi-step work with a structured todo list that persists across sessions and displays live progress in a widget above your editor.

> **Heads up:** [pi-tasks](https://github.com/tintinweb/pi-tasks/) is a superior successor to this extension. New users should prefer it.

> **Status:** Production-ready. Faithful replication of Copilot's manage_todo_list with enhanced visual feedback and session persistence.

<img width="600"  alt="image" src="https://github.com/tintinweb/pi-manage-todo-list/raw/master/media/screenshot.png" />




https://github.com/user-attachments/assets/8efa7668-bdd8-4750-9c8b-638f15c32e4a




## Features

### Core `manage_todo_list` Tool (Copilot-compatible)
- **Two operations**: `read` (retrieve current list) and `write` (complete replacement)
- **TodoItem schema**: `id`, `title`, `description`, `status` (not-started | in-progress | completed)
- **Validation**: Required fields, valid statuses, complete replacement only
- **Multiple in-progress**: Supports parallel work and subagents
- **Smart warnings**: Alerts when todo list is too small (<3 items)
- **LLM guidance**: CRITICAL workflow — plan → mark in-progress → complete → mark completed → repeat

### Enhanced Pi Features
- ✓ **Live widget** above editor showing real-time progress with status icons
- ✓ **Session persistence** across switches, forks, and tree navigation
- ✓ **Themed display** with colors and strikethrough for completed items
- ✓ **User commands**: `/todos` (toggle/stats) and `/todos clear` (reset)
- ✓ **Status icons**: `✓` completed, `◉` in-progress, `○` not-started
- ✓ **Enhanced feedback**: Progress stats and continuation instructions in tool responses
- ✓ **Small list detection**: Warns when todo list might be unnecessary

## Install

**Option A — Install from npm:**
```bash
pi install npm:pi-manage-todo-list
```

**Option B — Load directly (dev):**
```bash
pi -e ~/projects/pi-manage-todo-list/src/index.ts
```

**Option C — Install from local folder:**
```bash
pi install ~/projects/pi-manage-todo-list
```

Then run `pi` normally; the extension auto-discovers.

## Usage

### LLM-driven (automatic)

The agent automatically uses `manage_todo_list` for complex multi-step work:

```
You: Build a REST API with authentication, rate limiting, and tests.

Agent: I'll break this into a structured todo list:
[calls manage_todo_list with write operation]
1. ○ Design API endpoints (not-started)
2. ○ Implement authentication middleware (not-started)
3. ○ Add rate limiting (not-started)
4. ○ Write integration tests (not-started)

Now starting with the first task...
[calls manage_todo_list to mark #1 as in-progress]
```

The widget displays above your editor:

```
 Todo List — 0/4 completed
  ◉ 1. Design API endpoints
  ○ 2. Implement authentication middleware
  ○ 3. Add rate limiting
  ○ 4. Write integration tests
```

### User commands

| Command | Description |
|---------|-------------|
| `/todos` | Show completion stats and refresh widget |
| `/todos clear` | Clear entire todo list |

## How It Works

**State Management:**
- In-memory state per session via `TodoStateManager`
- Persists via `details` field in tool results
- Auto-reconstructs on session events (start/switch/fork/tree)

**Widget:**
- Read-only display with progress stats
- Icons, colors, and strikethrough for visual clarity
- Updates after every `manage_todo_list` call

**Tool Rendering:**
- `renderCall`: Shows operation type and item count
- `renderResult`: Expandable view with status breakdown

## Comparison to Copilot

| Feature | Copilot | pi-manage-todo-list |
|---------|---------|---------------------|
| **Tool Schema** | Identical | ✓ |
| **Multiple in-progress** | Allowed | ✓ |
| **Small list warning** | Yes (<3 items) | ✓ |
| **LLM Workflow** | Basic | Enhanced with continuation instructions |
| **Progress Stats** | Not in response | ✓ Shows X/Y completed |
| **UI Visibility** | None | Live widget |
| **Persistence** | Conversation only | Session file + tool details |
| **Visual Feedback** | Text only | Themed icons + colors |
| **User Control** | None | `/todos` commands |

## Development

**TypeScript check:**
```bash
npx tsc --noEmit
```

**Test with Pi:**
```bash
pi -e ./src/index.ts --print "create 3 todos: review code, write tests, deploy"
```

## Project Structure

```
src/
  types.ts          # TodoItem, TodoDetails, TodoStatus
  state-manager.ts  # In-memory state + validation
  tool.ts           # manage_todo_list tool definition
  ui/
    todo-widget.ts  # Read-only widget above editor
  index.ts          # Extension entry point
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

## License

MIT (see [LICENSE](LICENSE))

## Author

[tintinweb](https://github.com/tintinweb)
