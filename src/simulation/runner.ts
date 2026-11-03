export type SimStatus = "idle" | "running" | "paused" | "done";

export interface SimSnapshot {
  status: SimStatus;
  index: number;
  stepCount: number;
  startedPath: string | null;
  reducedMotion: boolean;
  notice: string | null;
}

export type SimAction =
  | { type: "start"; path: string; reducedMotion: boolean }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "next" }
  | { type: "back" }
  | { type: "skip" }
  | { type: "exit" };

export const initialSim: SimSnapshot = {
  status: "idle",
  index: 0,
  stepCount: 0,
  startedPath: null,
  reducedMotion: false,
  notice: null,
};

export function reduceSimulation(state: SimSnapshot, action: SimAction, stepCount: number): SimSnapshot {
  if (action.type === "start") {
    if (state.status === "running") return state;
    return {
      status: "running",
      index: 0,
      stepCount,
      startedPath: action.path,
      reducedMotion: action.reducedMotion,
      notice: null,
    };
  }
  if (action.type === "exit") {
    return { ...initialSim, stepCount: state.stepCount };
  }
  if (state.status !== "running" && state.status !== "paused" && state.status !== "done") return state;

  if (action.type === "pause") {
    if (state.status !== "running") return state;
    return { ...state, status: "paused" };
  }
  if (action.type === "resume") {
    if (state.status !== "paused") return state;
    return { ...state, status: "running" };
  }
  if (action.type === "back") {
    if (state.status === "done") return { ...state, status: "running", index: Math.max(0, stepCount - 1), notice: null };
    if (state.index === 0) return state;
    return { ...state, status: "running", index: state.index - 1, notice: null };
  }
  if (action.type === "next" || action.type === "skip") {
    const next = state.index + 1;
    const notice = action.type === "skip" ? "Skipped a step because that control is not on the page." : null;
    if (next >= stepCount) return { ...state, status: "done", notice };
    return { ...state, status: "running", index: next, notice };
  }
  return state;
}

export interface CleanupHooks {
  removeListeners: Array<() => void>;
  restoreFetch: () => void;
  restoreRoute: (path: string) => void;
}

export function cleanupSimulation(startedPath: string | null, hooks: CleanupHooks): string | null {
  for (const remove of hooks.removeListeners) remove();
  hooks.restoreFetch();
  if (startedPath) hooks.restoreRoute(startedPath);
  return startedPath;
}

export function targetSelector(name: string): string {
  return `[data-sim-target="${name}"]`;
}
