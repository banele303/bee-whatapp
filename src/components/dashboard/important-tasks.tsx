"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Plus,
  Trash2,
  ExternalLink,
  AlertCircle,
  Clock,
  Check,
} from "lucide-react";

export interface DashboardTask {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: number;
}

const STORAGE_KEY = "wacrm_dashboard_important_tasks_v1";

const DEFAULT_TASKS: DashboardTask[] = [
  {
    id: "t-session",
    title: "Review & sign off pending session notes",
    priority: "high",
    completed: false,
    actionUrl: "/session",
    actionLabel: "Open Session",
    createdAt: 1726040000000,
  },
  {
    id: "t-inbox",
    title: "Respond to urgent unread WhatsApp inquiries & triage messages",
    priority: "high",
    completed: false,
    actionUrl: "/inbox",
    actionLabel: "Open Inbox",
    createdAt: 1726041000000,
  },
  {
    id: "t-appointments",
    title: "Review today's scheduled appointments and patient files",
    priority: "medium",
    completed: false,
    actionUrl: "/appointments",
    actionLabel: "View Schedule",
    createdAt: 1726042000000,
  },
  {
    id: "t-deals",
    title: "Follow up on high-value open deals and pending customer quotes",
    priority: "medium",
    completed: false,
    actionUrl: "/pipelines",
    actionLabel: "View Pipeline",
    createdAt: 1726043000000,
  },
];

export function ImportantTasks() {
  const [tasks, setTasks] = useState<DashboardTask[]>(DEFAULT_TASKS);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("high");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed);
        }
      }
    } catch {
      // Fallback to default tasks
    }
  }, []);

  const saveTasks = (updated: DashboardTask[]) => {
    setTasks(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    saveTasks(updated);
  };

  const addTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    const newTask: DashboardTask = {
      id: `task-${Date.now()}`,
      title: trimmed,
      priority: newPriority,
      completed: false,
      createdAt: Date.now(),
    };

    saveTasks([newTask, ...tasks]);
    setNewTitle("");
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  if (!isMounted) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-muted/60 rounded" />
          <div className="h-10 bg-muted/60 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              Important Things To Do
              <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                <Clock className="h-3 w-3" />
                Today
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Critical daily actions, patient follow-ups, and practice priorities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
            {completedCount} of {tasks.length} completed
          </span>
          {completedCount > 0 && (
            <button
              onClick={() => saveTasks(tasks.filter((t) => !t.completed))}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Clear done
            </button>
          )}
        </div>
      </div>

      {/* Task Input Form */}
      <form onSubmit={addTask} className="mt-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add an important task for today..."
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as "high" | "medium" | "low")}
            aria-label="Task priority"
            className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </form>

      {/* Task List */}
      <div className="mt-4 space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border rounded-lg">
            <Check className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-foreground">All caught up!</p>
            <p className="text-[11px] text-muted-foreground">No pending important tasks for today.</p>
          </div>
        ) : (
          tasks.map((task) => {
            const isHigh = task.priority === "high";
            const isMed = task.priority === "medium";

            return (
              <div
                key={task.id}
                className={`group flex items-start sm:items-center justify-between gap-3 p-3 rounded-lg border transition-all ${
                  task.completed
                    ? "bg-muted/30 border-border/60 opacity-60"
                    : isHigh
                    ? "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40"
                    : "bg-background border-border hover:border-border/80"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className={`mt-0.5 sm:mt-0 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      task.completed
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/40 hover:border-primary"
                    }`}
                  >
                    {task.completed && <Check className="h-3 w-3 stroke-[3]" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm break-words ${
                          task.completed
                            ? "line-through text-muted-foreground"
                            : "text-foreground font-medium"
                        }`}
                      >
                        {task.title}
                      </span>

                      {isHigh && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          <AlertCircle className="h-2.5 w-2.5" />
                          High
                        </span>
                      )}

                      {isMed && (
                        <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Medium
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {task.actionUrl && (
                    <Link
                      href={task.actionUrl}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                    >
                      <span>{task.actionLabel || "View"}</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    title="Delete task"
                    className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-70 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
