/**
 * End-to-end tests for the pi-manage-todo-list extension.
 *
 * Each test loads the real extension (src/index.ts) into a fake pi runtime and
 * exercises it the way the runtime would — calling the registered tool, running
 * the /todos command, and firing lifecycle events — then asserts on the observable
 * side effects: tool results, the widget above the editor, and notifications.
 */

import { beforeEach, describe, expect, it } from "vitest";
import createExtension from "../src/index.js";
import {
  createMockContext,
  createMockPi,
  type MockContext,
  type MockPi,
  recordingTheme,
  renderWidget,
  textOf,
  todoResultEntry,
  todos,
} from "./harness.js";

/** Load the extension and return its harness plus a fresh context. */
function setup(branch: unknown[] = []): MockPi & MockContext {
  const pi = createMockPi();
  createExtension(pi.pi);
  const mockCtx = createMockContext(branch);
  return { ...pi, ...mockCtx };
}

async function write(s: MockPi & MockContext, list: ReturnType<typeof todos>) {
  return s.tool().execute("call-write", { operation: "write", todoList: list }, undefined, undefined, s.ctx);
}

async function read(s: MockPi & MockContext) {
  return s.tool().execute("call-read", { operation: "read" }, undefined, undefined, s.ctx);
}

describe("extension wiring", () => {
  it("registers the tool, the /todos command, and lifecycle handlers", () => {
    const s = setup();

    expect(s.tool()).toBeDefined();
    expect(s.tool().name).toBe("manage_todo_list");
    expect(s.tool().parameters).toBeDefined();

    expect(s.command("todos")).toBeDefined();
    expect(s.command("todos").description).toMatch(/todo/i);

    for (const event of ["session_start", "session_tree", "turn_start", "turn_end"]) {
      expect(s.handlers.get(event)?.length).toBeGreaterThan(0);
    }
  });
});

describe("write → widget → read cycle", () => {
  let s: MockPi & MockContext;

  beforeEach(async () => {
    s = setup();
    // A turn begins, which is when the runtime hands us a context.
    await s.fire("turn_start", s.ctx);
  });

  it("writes todos, reports progress, and renders the widget", async () => {
    const result = await write(s, todos(["not-started", "not-started", "not-started"]));

    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toContain("0/3 completed");
    expect(textOf(result)).not.toContain("Small todo list");
    expect(result.details.todos).toHaveLength(3);

    const lines = renderWidget(s.widgets);
    expect(lines).toBeDefined();
    const widget = (lines as string[]).join("\n");
    expect(widget).toContain("Todo List");
    expect(widget).toContain("0/3 completed");
    expect(widget).toContain("Task 1");
    expect(widget).toContain("Task 3");
  });

  it("reads the in-memory list back as JSON", async () => {
    await write(s, todos(["in-progress", "not-started"]));

    const result = await read(s);
    const parsed = JSON.parse(textOf(result));
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ id: 1, title: "Task 1", status: "in-progress" });
    expect(result.details.operation).toBe("read");
  });

  it("reports an empty list before anything is written", async () => {
    const result = await read(s);
    expect(textOf(result)).toContain("No todos");
    expect(result.details.todos).toHaveLength(0);
  });
});

describe("progress tracking and widget styling", () => {
  it("reflects mixed statuses in stats and styles items distinctly", async () => {
    const s = setup();
    await s.fire("turn_start", s.ctx);

    const result = await write(s, todos(["completed", "in-progress", "not-started"]));
    expect(textOf(result)).toContain("1/3 completed");

    const widget = (renderWidget(s.widgets) as string[]).join("\n");
    expect(widget).toContain("1/3 completed");
    // Completed item is struck through (theme.strikethrough wraps with ~…~).
    expect(widget).toContain("~Task 1~");
    // In-progress / not-started titles are shown verbatim.
    expect(widget).toContain("Task 2");
    expect(widget).toContain("Task 3");
    expect(widget).not.toContain("~Task 2~");
  });

  it("aligns todo IDs across statuses", async () => {
    const s = setup();
    await s.fire("turn_start", s.ctx);
    await write(s, todos(["completed", "in-progress", "not-started"]));

    expect(renderWidget(s.widgets)?.slice(1)).toEqual([
      "  ✓ 1. ~Task 1~",
      "  ◉ 2. Task 2",
      "  ○ 3. Task 3",
    ]);
  });
});

describe("complete replacement semantics", () => {
  it("a second write fully replaces the first list", async () => {
    const s = setup();
    await s.fire("turn_start", s.ctx);

    await write(s, todos(["not-started", "not-started", "not-started"]));

    const second = [
      { id: 10, title: "Only remaining task", description: "kept", status: "completed" as const },
      { id: 11, title: "Second remaining task", description: "kept", status: "not-started" as const },
    ];
    await write(s, second);

    const parsed = JSON.parse(textOf(await read(s)));
    expect(parsed).toHaveLength(2);
    expect(parsed.map((t: { title: string }) => t.title)).toEqual([
      "Only remaining task",
      "Second remaining task",
    ]);
    // None of the original tasks survive.
    expect(parsed.some((t: { title: string }) => t.title === "Task 1")).toBe(false);
  });
});

describe("validation", () => {
  let s: MockPi & MockContext;

  beforeEach(async () => {
    s = setup();
    await s.fire("turn_start", s.ctx);
  });

  it("rejects a write with missing/invalid fields and leaves state untouched", async () => {
    await write(s, todos(["completed", "not-started", "not-started"]));
    const widgetBefore = renderWidget(s.widgets);

    const bad = [
      { id: 1, title: "", description: "no title", status: "not-started" },
      { id: 2, title: "Bad status", description: "x", status: "doing" },
      { title: "No id", description: "x", status: "completed" },
    ] as never;
    const result = await write(s, bad);

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Validation failed");
    expect(result.details.error).toBeTruthy();

    // The previously valid list is still intact.
    const parsed = JSON.parse(textOf(await read(s)));
    expect(parsed).toHaveLength(3);
    expect(parsed[0].status).toBe("completed");
    // Widget was not clobbered with the bad data.
    expect(renderWidget(s.widgets)).toEqual(widgetBefore);
  });

  it("collects one error per offending field", async () => {
    const bad = [{ id: "x", title: "", description: "", status: "nope" }] as never;
    const result = await write(s, bad);

    expect(result.isError).toBe(true);
    const text = textOf(result);
    expect(text).toMatch(/id/);
    expect(text).toMatch(/title/);
    expect(text).toMatch(/description/);
    expect(text).toMatch(/status/);
  });

  it("distinguishes a missing id from a wrong-typed id", async () => {
    // A null/absent id must yield the "missing 'id'" message specifically — not
    // the "must be a number" message, which is for a present-but-wrong-typed id.
    const missing = [{ title: "No id", description: "x", status: "completed" }] as never;
    expect(textOf(await write(s, missing))).toMatch(/missing 'id'/);

    const wrongType = [{ id: "x", title: "Bad id", description: "x", status: "completed" }] as never;
    const wrongText = textOf(await write(s, wrongType));
    expect(wrongText).toMatch(/'id' must be a number/);
    expect(wrongText).not.toMatch(/missing 'id'/);
  });

  it("errors when a write omits todoList entirely", async () => {
    const result = await s
      .tool()
      .execute("call-x", { operation: "write" }, undefined, undefined, s.ctx);
    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/todoList is required/i);
  });
});

describe("small-list warning", () => {
  it("warns for fewer than 3 items and not otherwise", async () => {
    const s = setup();
    await s.fire("turn_start", s.ctx);

    expect(textOf(await write(s, todos(["not-started", "not-started"])))).toContain("Small todo list");
    expect(textOf(await write(s, todos(["not-started", "not-started", "not-started"])))).not.toContain(
      "Small todo list"
    );
  });
});

describe("/todos command", () => {
  it("clears todos and removes the widget", async () => {
    const s = setup();
    await s.fire("turn_start", s.ctx);
    await write(s, todos(["completed", "not-started", "not-started"]));
    expect(renderWidget(s.widgets)).toBeDefined();

    await s.command("todos").handler("clear", s.ctx);

    expect(textOf(await read(s))).toContain("No todos");
    expect(renderWidget(s.widgets)).toBeUndefined();
    expect(s.notifications.at(-1)?.message).toMatch(/cleared/i);
  });

  it("reports stats when todos exist", async () => {
    const s = setup();
    await s.fire("turn_start", s.ctx);
    await write(s, todos(["completed", "completed", "not-started"]));

    await s.command("todos").handler("", s.ctx);

    expect(s.notifications.at(-1)?.message).toContain("2/3");
    expect(renderWidget(s.widgets)).toBeDefined();
  });

  it("notifies when there are no todos", async () => {
    const s = setup();
    await s.fire("turn_start", s.ctx);

    await s.command("todos").handler("", s.ctx);

    expect(s.notifications.at(-1)?.message).toMatch(/no todos/i);
  });
});

describe("session persistence / reconstruction", () => {
  it("rebuilds state from a persisted tool result on session_start", async () => {
    const persisted = todos(["completed", "in-progress", "not-started"]);
    const s = setup([todoResultEntry(persisted)]);

    await s.fire("session_start", s.ctx);

    // Widget reflects the reconstructed list...
    const widget = (renderWidget(s.widgets) as string[]).join("\n");
    expect(widget).toContain("1/3 completed");
    expect(widget).toContain("~Task 1~");

    // ...and a read returns it without any new write.
    const parsed = JSON.parse(textOf(await read(s)));
    expect(parsed).toHaveLength(3);
    expect(parsed[1].status).toBe("in-progress");
  });

  it("uses the latest tool result when several are present", async () => {
    const branch = [
      todoResultEntry(todos(["not-started", "not-started"])),
      todoResultEntry(todos(["completed", "completed", "completed"])),
    ];
    const s = setup(branch);

    await s.fire("session_start", s.ctx);

    expect((renderWidget(s.widgets) as string[]).join("\n")).toContain("3/3 completed");
  });

  it("reconstructs on session_tree navigation too", async () => {
    const s = setup([todoResultEntry(todos(["completed", "not-started"]))]);
    await s.fire("session_tree", s.ctx);
    expect((renderWidget(s.widgets) as string[]).join("\n")).toContain("1/2 completed");
  });

  it("ignores unrelated session entries", async () => {
    // The other tool's result carries a *populated* todos payload. Only the
    // toolName filter stops it from being loaded — if that filter regressed,
    // these todos would render, so this asserts the filter specifically.
    const branch = [
      { type: "message", message: { role: "user", content: "hello" } },
      {
        type: "message",
        message: {
          role: "toolResult",
          toolName: "some_other_tool",
          details: { operation: "write", todos: todos(["completed", "completed", "completed"]) },
        },
      },
    ];
    const s = setup(branch);

    await s.fire("session_start", s.ctx);

    expect(renderWidget(s.widgets)).toBeUndefined();
    expect(textOf(await read(s))).toContain("No todos");
  });
});

describe("tool result rendering", () => {
  it("renderCall shows operation and item count", () => {
    const s = setup();

    const w = recordingTheme();
    s.tool().renderCall(
      { operation: "write", todoList: todos(["not-started", "not-started", "not-started"]) },
      w.theme
    );
    expect(w.text()).toContain("write");
    expect(w.text()).toContain("3 items");

    const one = recordingTheme();
    s.tool().renderCall({ operation: "write", todoList: todos(["not-started"]) }, one.theme);
    expect(one.text()).toContain("1 item");
    expect(one.text()).not.toContain("1 items");

    const r = recordingTheme();
    s.tool().renderCall({ operation: "read" }, r.theme);
    expect(r.text()).toContain("read");
  });

  it("renderResult summarizes when collapsed and lists items when expanded", () => {
    const s = setup();
    const ok = {
      content: [{ type: "text", text: "" }],
      details: { operation: "write", todos: todos(["completed", "not-started"]) },
    };

    const collapsed = recordingTheme();
    s.tool().renderResult(ok, { expanded: false }, collapsed.theme);
    expect(collapsed.text()).toContain("1/2 completed");
    expect(collapsed.text()).not.toContain("Task 1");

    const expanded = recordingTheme();
    s.tool().renderResult(ok, { expanded: true }, expanded.theme);
    expect(expanded.text()).toContain("1/2 completed");
    expect(expanded.text()).toContain("Task 1");
    expect(expanded.text()).toContain("Task 2");
  });

  it("renderResult surfaces an error from the details", () => {
    const s = setup();
    const errored = {
      content: [{ type: "text", text: "" }],
      details: { operation: "write", todos: [], error: "boom" },
    };

    const err = recordingTheme();
    s.tool().renderResult(errored, { expanded: true }, err.theme);
    expect(err.text()).toContain("boom");
  });

  it("renderResult falls back to the content text when details are absent", () => {
    const s = setup();
    const r = recordingTheme();
    const node = s
      .tool()
      .renderResult({ content: [{ type: "text", text: "plain message" }] }, { expanded: true }, r.theme);
    // No theming is applied on the fallback path, so the text lives on the node itself.
    expect(JSON.stringify(node)).toContain("plain message");
  });

  it("renderResult shows 'No todos' when the list is empty", () => {
    const s = setup();
    const r = recordingTheme();
    s.tool().renderResult(
      { content: [{ type: "text", text: "" }], details: { operation: "read", todos: [] } },
      { expanded: true },
      r.theme
    );
    expect(r.text()).toContain("No todos");
  });
});

describe("turn_end re-syncs the widget", () => {
  it("renders in-memory state on turn_end even when the write could not draw it", async () => {
    // Write before any context exists: the state is stored, but onTodoUpdate
    // no-ops (no currentCtx yet), so the widget is NOT drawn by the write itself.
    const s = setup();
    await write(s, todos(["completed", "completed", "not-started"]));
    expect(renderWidget(s.widgets)).toBeUndefined();

    // turn_end is the first moment the extension is handed a context — it must
    // render the already-stored state. If the turn_end handler did nothing, the
    // widget would stay undefined and this assertion would fail.
    await s.fire("turn_end", s.ctx);
    expect((renderWidget(s.widgets) as string[]).join("\n")).toContain("2/3 completed");
  });
});

describe("write without an active turn context", () => {
  it("persists state without throwing when no context has been seen yet", async () => {
    // No turn_start / session_start fired — currentCtx is undefined inside the
    // extension, so onTodoUpdate must no-op rather than crash.
    const s = setup();

    const result = await write(s, todos(["not-started", "not-started", "not-started"]));
    expect(result.isError).toBeFalsy();
    expect(result.details.todos).toHaveLength(3);

    // State persisted even though no widget could be drawn yet.
    const parsed = JSON.parse(textOf(await read(s)));
    expect(parsed).toHaveLength(3);
    // The widget was never set because there was no context to draw into.
    expect(renderWidget(s.widgets)).toBeUndefined();
  });
});

describe("multiple in-progress items are allowed", () => {
  it("accepts more than one in-progress todo (v0.2.0 parallel-work behavior)", async () => {
    const s = setup();
    await s.fire("turn_start", s.ctx);

    const result = await write(s, todos(["in-progress", "in-progress", "completed"]));

    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toContain("1/3 completed");
    const parsed = JSON.parse(textOf(await read(s)));
    expect(parsed.filter((t: { status: string }) => t.status === "in-progress")).toHaveLength(2);
  });
});

describe("empty-array write", () => {
  it("clears the list, removes the widget, and warns about the small list", async () => {
    const s = setup();
    await s.fire("turn_start", s.ctx);
    await write(s, todos(["completed", "not-started", "not-started"]));
    expect(renderWidget(s.widgets)).toBeDefined();

    const result = await write(s, []);

    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toContain("0/0 completed");
    expect(textOf(result)).toContain("Small todo list");
    // Empty list => widget is torn down.
    expect(renderWidget(s.widgets)).toBeUndefined();
    expect(textOf(await read(s))).toContain("No todos");
  });
});

describe("reconstruction can clear a previously loaded list", () => {
  it("navigating to a branch with no todos empties existing state", async () => {
    // Start with a populated branch and reconstruct it.
    const s = setup([todoResultEntry(todos(["completed", "not-started"]))]);
    await s.fire("session_start", s.ctx);
    expect((renderWidget(s.widgets) as string[]).join("\n")).toContain("1/2 completed");

    // Point the same context at an empty branch and re-fire (as tree navigation would).
    (s.ctx as unknown as { sessionManager: { getBranch: () => unknown[] } }).sessionManager.getBranch =
      () => [];
    await s.fire("session_tree", s.ctx);

    expect(renderWidget(s.widgets)).toBeUndefined();
    expect(textOf(await read(s))).toContain("No todos");
  });
});
