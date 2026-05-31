/**
 * Test harness — minimal in-memory fakes for the pi ExtensionAPI / ExtensionContext.
 *
 * These let the tests load the real extension (src/index.ts) and drive it through
 * its public surface exactly as the pi runtime would: registering a tool + command,
 * firing lifecycle events, and observing widget/notification side effects.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { TodoItem } from "../src/types.js";

export type WidgetFactory = (
  tui: unknown,
  theme: unknown
) => { render: () => string[]; invalidate: () => void };

/** A theme stub. `fg`/`bold` are identity (so content assertions stay clean);
 *  `strikethrough` wraps with `~…~` so completed-item styling is observable. */
export function createTheme() {
  return {
    fg: (_role: string, text: string) => text,
    bold: (text: string) => text,
    strikethrough: (text: string) => `~${text}~`,
  };
}

/** A theme that records every visible string the render functions emit. This lets
 *  render tests assert on output without coupling to pi-tui's Text internals — every
 *  user-visible substring flows through fg/bold/strikethrough. */
export function recordingTheme() {
  const calls: string[] = [];
  const theme = {
    fg: (_role: string, text: string) => {
      calls.push(text);
      return text;
    },
    bold: (text: string) => {
      calls.push(text);
      return text;
    },
    strikethrough: (text: string) => {
      const wrapped = `~${text}~`;
      calls.push(wrapped);
      return wrapped;
    },
  };
  return { theme, calls, text: () => calls.join(" ") };
}

export interface MockContext {
  ctx: ExtensionContext;
  widgets: Map<string, WidgetFactory | undefined>;
  notifications: Array<{ message: string; level: string }>;
}

/** Build a fake ExtensionContext backed by an optional session branch. */
export function createMockContext(branch: unknown[] = []): MockContext {
  const widgets = new Map<string, WidgetFactory | undefined>();
  const notifications: Array<{ message: string; level: string }> = [];

  const ctx = {
    ui: {
      setWidget(id: string, factory: WidgetFactory | undefined) {
        if (factory === undefined) widgets.delete(id);
        else widgets.set(id, factory);
      },
      notify(message: string, level: string) {
        notifications.push({ message, level });
      },
    },
    sessionManager: {
      getBranch: () => branch,
    },
  };

  return { ctx: ctx as unknown as ExtensionContext, widgets, notifications };
}

type EventHandler = (event: unknown, ctx: ExtensionContext) => unknown | Promise<unknown>;

export interface MockPi {
  pi: ExtensionAPI;
  handlers: Map<string, EventHandler[]>;
  tools: Array<Record<string, any>>;
  commands: Map<string, { description: string; handler: (args: string, ctx: ExtensionContext) => Promise<void> }>;
  /** Fire a lifecycle event to every registered handler (awaits all). */
  fire(event: string, ctx: ExtensionContext): Promise<void>;
  /** The registered manage_todo_list tool. */
  tool(): Record<string, any>;
  /** A registered command by name. */
  command(name: string): { description: string; handler: (args: string, ctx: ExtensionContext) => Promise<void> };
}

/** Build a fake ExtensionAPI that records everything the extension registers. */
export function createMockPi(): MockPi {
  const handlers = new Map<string, EventHandler[]>();
  const tools: Array<Record<string, any>> = [];
  const commands = new Map<string, any>();

  const pi = {
    on(event: string, handler: EventHandler) {
      const arr = handlers.get(event) ?? [];
      arr.push(handler);
      handlers.set(event, arr);
    },
    registerTool(tool: Record<string, any>) {
      tools.push(tool);
      return () => {};
    },
    registerCommand(name: string, def: any) {
      commands.set(name, def);
    },
  };

  return {
    pi: pi as unknown as ExtensionAPI,
    handlers,
    tools,
    commands,
    async fire(event: string, ctx: ExtensionContext) {
      for (const h of handlers.get(event) ?? []) await h({}, ctx);
    },
    tool: () => tools.find((t) => t.name === "manage_todo_list") as Record<string, any>,
    command: (name: string) => commands.get(name),
  };
}

/** Render whatever widget is currently registered under `todo-list`, or undefined. */
export function renderWidget(widgets: Map<string, WidgetFactory | undefined>): string[] | undefined {
  const factory = widgets.get("todo-list");
  if (!factory) return undefined;
  return factory({}, createTheme()).render();
}

/** Extract the text payload from a tool result's first content block. */
export function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
  const first = result.content[0];
  return first && "text" in first ? (first.text ?? "") : "";
}

/** A session-branch entry mimicking a persisted manage_todo_list tool result. */
export function todoResultEntry(todos: TodoItem[]) {
  return {
    type: "message",
    message: {
      role: "toolResult",
      toolName: "manage_todo_list",
      details: { operation: "write", todos },
    },
  };
}

/** Build a list of todos with the given statuses. */
export function todos(statuses: TodoItem["status"][]): TodoItem[] {
  return statuses.map((status, i) => ({
    id: i + 1,
    title: `Task ${i + 1}`,
    description: `Do the work for task ${i + 1}`,
    status,
  }));
}
