/**
 * TodoWidget — read-only widget that shows the current todo list.
 *
 * Displayed above the editor using ctx.ui.setWidget().
 * Shows status icons, progress stats, and a flat list.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { TodoStateManager } from "../state-manager.js";

const WIDGET_ID = "todo-list";

/** Status icons for each todo state */
export const STATUS_ICONS: Record<string, string> = {
  "completed": "✓",
  "in-progress": "◉ ",
  "not-started": "○",
};

/**
 * Update (or clear) the todo widget.
 * Call this after every state change.
 */
export function updateWidget(state: TodoStateManager, ctx: ExtensionContext): void {
  const todos = state.read();

  if (todos.length === 0) {
    ctx.ui.setWidget(WIDGET_ID, undefined);
    return;
  }

  const stats = state.getStats();

  ctx.ui.setWidget(WIDGET_ID, (_tui, theme) => {
    const lines: string[] = [];

    // Header with progress
    const header =
      theme.fg("accent", " Todo List ") +
      theme.fg("muted", `— ${stats.completed}/${stats.total} completed`);
    lines.push(header);

    // Each todo item
    for (const todo of todos) {
      const icon = STATUS_ICONS[todo.status] ?? "⏳";
      const id = theme.fg("accent", `${todo.id}.`);

      let title: string;
      if (todo.status === "completed") {
        title = theme.fg("dim", theme.strikethrough(todo.title));
      } else if (todo.status === "in-progress") {
        title = theme.fg("warning", todo.title);
      } else {
        title = todo.title;
      }

      lines.push(`  ${icon} ${id} ${title}`);
    }

    return {
      render: () => lines,
      invalidate: () => {},
    };
  });
}

/** Clear the widget */
export function clearWidget(ctx: ExtensionContext): void {
  ctx.ui.setWidget(WIDGET_ID, undefined);
}
