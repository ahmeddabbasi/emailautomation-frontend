"use client";

import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SIM_STEPS } from "@/simulation/script";
import { installFetchGuard } from "@/simulation/guard";
import { cleanupSimulation, initialSim, reduceSimulation, targetSelector, type SimAction, type SimSnapshot } from "@/simulation/runner";

const SimulationContext = createContext<{ start: () => void; active: boolean } | null>(null);

export function useSimulation() {
  const value = useContext(SimulationContext);
  if (!value) throw new Error("Simulation is unavailable");
  return value;
}

function reduce(state: SimSnapshot, action: SimAction) {
  return reduceSimulation(state, action, SIM_STEPS.length);
}

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, dispatch] = useReducer(reduce, initialSim);
  const startedPath = useRef<string | null>(null);
  const restoreFetch = useRef<(() => void) | null>(null);
  const listeners = useRef<Array<() => void>>([]);
  const cleaned = useRef(true);
  const exitRef = useRef<() => void>(() => {});

  const finish = useCallback(
    (path: string | null) => {
      cleanupSimulation(path, {
        removeListeners: listeners.current,
        restoreFetch: () => {
          restoreFetch.current?.();
          restoreFetch.current = null;
        },
        restoreRoute: (value) => router.push(value),
      });
      listeners.current = [];
      startedPath.current = null;
    },
    [router]
  );

  exitRef.current = () => {
    if (cleaned.current) return;
    cleaned.current = true;
    const path = startedPath.current;
    dispatch({ type: "exit" });
    finish(path);
  };

  const start = useCallback(() => {
    if (!cleaned.current) {
      dispatch({
        type: "start",
        path: startedPath.current ?? pathname,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
      return;
    }
    cleaned.current = false;
    startedPath.current = pathname;
    restoreFetch.current = installFetchGuard(window.fetch);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") exitRef.current();
    };
    const onLeave = () => exitRef.current();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pagehide", onLeave);
    listeners.current = [
      () => window.removeEventListener("keydown", onKey),
      () => window.removeEventListener("pagehide", onLeave),
    ];
    dispatch({
      type: "start",
      path: pathname,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  }, [pathname]);

  const active = state.status !== "idle";

  return (
    <SimulationContext.Provider value={{ start, active }}>
      {children}
      {active && <SimulationOverlay state={state} dispatch={dispatch} pathname={pathname} onExit={() => exitRef.current()} onReplay={start} />}
    </SimulationContext.Provider>
  );
}

function SimulationOverlay({
  state,
  dispatch,
  pathname,
  onExit,
  onReplay,
}: {
  state: SimSnapshot;
  dispatch: React.Dispatch<SimAction>;
  pathname: string;
  onExit: () => void;
  onReplay: () => void;
}) {
  const router = useRouter();
  const step = SIM_STEPS[state.index];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [locatedFor, setLocatedFor] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const captionRef = useRef<HTMLHeadingElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.status !== "running" || !step) return;
    if (pathname !== step.href) {
      router.push(step.href);
      return;
    }
    let tries = 0;
    let reveal = 0;
    const timer = window.setInterval(() => {
      const found =
        document.querySelector(targetSelector(step.target)) ??
        (step.fallbackTarget ? document.querySelector(targetSelector(step.fallbackTarget)) : null);
      tries += 1;
      if (found instanceof HTMLElement) {
        window.clearInterval(timer);
        found.scrollIntoView({ block: "center", inline: "nearest", behavior: state.reducedMotion ? "auto" : "smooth" });
        reveal = window.setTimeout(() => {
          setRect(found.getBoundingClientRect());
          setLocatedFor(state.index);
        }, state.reducedMotion ? 0 : 350);
        return;
      }
      if (tries >= 12) {
        window.clearInterval(timer);
        console.info(`Simulation skipped ${step.id}: target not found`);
        dispatch({ type: "skip" });
      }
    }, 200);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(reveal);
    };
  }, [state.status, state.index, step, pathname, router, dispatch, state.reducedMotion]);

  useEffect(() => {
    if (!rect) return;
    const update = () => {
      if (!step) return;
      const found =
        document.querySelector(targetSelector(step.target)) ??
        (step.fallbackTarget ? document.querySelector(targetSelector(step.fallbackTarget)) : null);
      if (found instanceof HTMLElement) setRect(found.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [rect, step]);

  useEffect(() => {
    setRect(null);
    setLocatedFor(null);
  }, [state.index]);

  useEffect(() => {
    const sample = step?.sample ?? "";
    if (state.reducedMotion || state.status !== "running") {
      setTyped(sample);
      return;
    }
    setTyped("");
    if (!sample) return;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(sample.slice(0, index));
      if (index >= sample.length) window.clearInterval(timer);
    }, 28);
    return () => window.clearInterval(timer);
  }, [step, state.status, state.reducedMotion, state.index]);

  useEffect(() => {
    if (state.status !== "running" || locatedFor !== state.index) return;
    const timer = window.setTimeout(() => dispatch({ type: "next" }), state.reducedMotion ? 3200 : 4600);
    return () => window.clearTimeout(timer);
  }, [state.status, state.index, state.reducedMotion, locatedFor, dispatch]);

  useEffect(() => {
    if (state.status === "done") exitRef.current?.focus();
    else captionRef.current?.focus();
  }, [state.status, state.index]);

  if (!step && state.status !== "done") return null;
  const progress = state.status === "done" ? SIM_STEPS.length : state.index + 1;
  const motion = state.reducedMotion ? "none" : "left 500ms ease, top 500ms ease";
  const captionStyle = captionPosition(rect);

  return (
    <div role="dialog" aria-modal="true" aria-label="Play simulation">
      <div className="fixed inset-0 z-[60] bg-transparent" />
      {rect && state.status !== "done" && (
        <div
          className="pointer-events-none fixed z-[61] rounded-md ring-2 ring-accent"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
            transition: state.reducedMotion ? "none" : "top 500ms ease, left 500ms ease, width 500ms ease, height 500ms ease",
          }}
        />
      )}
      {rect && state.status !== "done" && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[62]"
          style={{ left: rect.left + Math.min(24, Math.max(0, rect.width - 12)), top: rect.top + 8, transition: motion }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 3.5 L4 17.2 L8.1 13.4 L11.2 19.2 L13.6 18.1 L10.5 12.4 L16.2 12.1 Z" fill="white" stroke="#111" strokeWidth="1.4" />
          </svg>
        </div>
      )}
      {state.status !== "done" && step && (
        <div className="fixed z-[63] max-w-md rounded-lg border border-border bg-surface px-4 py-3 text-fg shadow-lg" style={captionStyle}>
          <h2 ref={captionRef} tabIndex={-1} className="text-[18px] font-semibold tracking-tight outline-none">
            {step.title}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-fg">{step.caption}</p>
          {typed && <p className="mt-2 font-mono text-[14px] text-fg">{typed}</p>}
          {state.notice && <p className="mt-2 text-[13px] text-muted">{state.notice}</p>}
          {pathname !== step.href && <p className="mt-2 text-[13px] text-muted">Opening this step.</p>}
        </div>
      )}
      <div className="fixed left-1/2 top-1/2 z-[70] flex w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-lg border border-border bg-surface px-4 py-4 text-fg shadow-lg">
        <p className="text-[15px] font-medium">Step {progress} of {SIM_STEPS.length}</p>
        <button
          ref={exitRef}
          type="button"
          onClick={onExit}
          className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-[15px] font-medium text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          Exit simulation
        </button>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Control label="Back" disabled={state.status !== "done" && state.index === 0} onClick={() => dispatch({ type: "back" })} />
          {state.status === "paused" ? (
            <Control label="Resume" onClick={() => dispatch({ type: "resume" })} />
          ) : (
            <Control label="Pause" disabled={state.status !== "running"} onClick={() => dispatch({ type: "pause" })} />
          )}
          <Control label="Next" disabled={state.status === "done"} onClick={() => dispatch({ type: "next" })} />
        </div>
        {state.status === "done" && (
          <>
            <p className="text-center text-[15px] leading-relaxed">The tour is finished. Nothing was saved or sent.</p>
            <Control label="Replay" onClick={onReplay} />
          </>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {state.status === "done"
          ? "Simulation finished. Nothing was saved or sent."
          : `Step ${progress} of ${SIM_STEPS.length}. ${step?.title ?? ""}. ${step?.caption ?? ""}`}
      </p>
    </div>
  );
}

function Control({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-[13.5px] font-medium text-fg hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function captionPosition(rect: DOMRect | null): { top: number; left: number } {
  if (!rect || typeof window === "undefined") return { top: 16, left: 16 };
  const left = Math.min(Math.max(16, rect.left), window.innerWidth - 440);
  const below = rect.bottom + 14;
  const overlapsCenter = below > window.innerHeight / 2 - 120 && rect.top < window.innerHeight / 2 + 120;
  if (overlapsCenter || below > window.innerHeight - 150) return { top: 16, left };
  return { top: below, left };
}
