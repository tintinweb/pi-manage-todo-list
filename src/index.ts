/**
 * pi-todo-list — A pi extension that replicates GitHub Copilot's manage_todo_list.
 *
 * Provides:
 * - A single `manage_todo_list` tool with read/write operations
 * - A read-only widget showing todo progress
 * - /todos command to toggle widget
 * - /todos clear command to clear the list
 * - Session persistence via tool result details
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { TodoStateManager } from "./state-manager.js";
import { createManageTodoListTool } from "./tool.js";
import { clearWidget, updateWidget } from "./ui/todo-widget.js";

export default function (pi: ExtensionAPI) {
  const state = new TodoStateManager();

  /** Callback invoked after every write — updates the widget */
  let currentCtx: ExtensionContext | undefined;

  const onTodoUpdate = () => {
    if (currentCtx) {
      updateWidget(state, currentCtx);
    }
  };

  // --- Reconstruct state from session on load/resume/fork/tree ---
  // session_start covers startup/reload/new/resume/fork; session_tree handles tree navigation.

  const reconstructState = (ctx: ExtensionContext) => {
    currentCtx = ctx;
    state.loadFromSession(ctx);
    updateWidget(state, ctx);
  };

  pi.on("session_start", async (_event, ctx) => reconstructState(ctx));
  pi.on("session_tree", async (_event, ctx) => reconstructState(ctx));

  // Keep ctx reference fresh on every turn
  pi.on("turn_start", async (_event, ctx) => {
    currentCtx = ctx;
  });

  // Update widget after each turn (in case tool was called)
  pi.on("turn_end", async (_event, ctx) => {
    currentCtx = ctx;
    updateWidget(state, ctx);
  });

  // --- Register the manage_todo_list tool ---

  const tool = createManageTodoListTool(state, onTodoUpdate);
  pi.registerTool(tool);

  // --- Register commands ---

  pi.registerCommand("todos", {
    description: "Toggle todo list widget or clear todos (/todos clear)",
    handler: async (args, ctx) => {
      currentCtx = ctx;

      if (args?.trim().toLowerCase() === "clear") {
        state.clear();
        clearWidget(ctx);
        ctx.ui.notify("Todo list cleared.", "info");
        return;
      }

      // Toggle: if todos exist, update widget; if empty, notify
      const todos = state.read();
      if (todos.length === 0) {
        ctx.ui.notify("No todos. The LLM will create them when working on complex tasks.", "info");
      } else {
        updateWidget(state, ctx);
        ctx.ui.notify(`${state.getStats().completed}/${state.getStats().total} todos completed.`, "info");
      }
    },
  });
}
