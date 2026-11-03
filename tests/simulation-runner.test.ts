import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { simulationShouldBlock } from "../src/simulation/guard.ts";
import { cleanupSimulation, initialSim, reduceSimulation } from "../src/simulation/runner.ts";

const script = readFileSync(new URL("../src/simulation/script.ts", import.meta.url), "utf8");
const count = (script.match(/id: "/g) ?? []).length;

test("the tour script names each workflow step", () => {
  for (const id of ["overview", "select-campaign", "campaign-brief", "add-recipients", "draft-email", "review", "results"]) {
    assert.match(script, new RegExp(`id: "${id}"`));
  }
  assert.equal(count, 7);
});

test("simulation blocks writes and still allows reads", () => {
  assert.equal(simulationShouldBlock("POST", "/api/openai/generate"), true);
  assert.equal(simulationShouldBlock("POST", "https://email.example/api/testing/raw-send"), true);
  assert.equal(simulationShouldBlock("DELETE", "/api/settings/openai"), true);
  assert.equal(simulationShouldBlock("GET", "/api/campaigns"), false);
  assert.equal(simulationShouldBlock("POST", "https://api.openai.com/v1/chat/completions"), false);
});

test("exit restores the route, removes listeners, and clears the fetch guard", () => {
  const started = reduceSimulation(initialSim, { type: "start", path: "/leads", reducedMotion: false }, count);
  const removed: string[] = [];
  let restoredFetch = false;
  let restoredPath = "";
  const path = cleanupSimulation(started.startedPath, {
    removeListeners: [() => removed.push("esc"), () => removed.push("resize")],
    restoreFetch: () => {
      restoredFetch = true;
    },
    restoreRoute: (value) => {
      restoredPath = value;
    },
  });
  const exited = reduceSimulation(started, { type: "exit" }, count);
  assert.equal(path, "/leads");
  assert.equal(restoredPath, "/leads");
  assert.equal(restoredFetch, true);
  assert.deepEqual(removed, ["esc", "resize"]);
  assert.equal(exited.status, "idle");
  assert.equal(exited.startedPath, null);
});

test("missing targets advance and the last skip finishes the tour", () => {
  let state = reduceSimulation(initialSim, { type: "start", path: "/dashboard", reducedMotion: true }, count);
  state = reduceSimulation(state, { type: "skip" }, count);
  assert.equal(state.index, 1);
  assert.match(state.notice ?? "", /Skipped/);
  state = { ...state, index: count - 1 };
  state = reduceSimulation(state, { type: "skip" }, count);
  assert.equal(state.status, "done");
});

test("pause holds the step, back does not pass the start, and next finishes", () => {
  let state = reduceSimulation(initialSim, { type: "start", path: "/dashboard", reducedMotion: false }, count);
  state = reduceSimulation(state, { type: "pause" }, count);
  assert.equal(state.status, "paused");
  assert.equal(state.index, 0);
  state = reduceSimulation(state, { type: "back" }, count);
  assert.equal(state.index, 0);
  state = reduceSimulation(state, { type: "resume" }, count);
  state = { ...state, index: count - 1, status: "running" };
  state = reduceSimulation(state, { type: "next" }, count);
  assert.equal(state.status, "done");
  state = reduceSimulation(state, { type: "start", path: "/dashboard", reducedMotion: false }, count);
  assert.equal(state.status, "running");
  assert.equal(state.index, 0);
});
