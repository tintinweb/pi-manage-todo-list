/**
 * Core types for the pi-todo-list extension.
 * Mirrors GitHub Copilot's manage_todo_list schema as closely as possible.
 */

/** Status of a single todo item */
export type TodoStatus = "not-started" | "in-progress" | "completed";

/** A single todo item — matches manage_todo_list schema exactly */
export interface TodoItem {
  /** Sequential identifier starting from 1 */
  id: number;
  /** Concise action-oriented label (3-7 words). Displayed in UI. */
  title: string;
  /** Detailed context, requirements, or implementation notes. */
  description: string;
  /** Current status. At most one item may be "in-progress" at a time. */
  status: TodoStatus;
}

/** Stored in tool result details for session persistence */
export interface TodoDetails {
  operation: "read" | "write";
  todos: TodoItem[];
  error?: string;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Stats about the current todo list */
export interface TodoStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}
