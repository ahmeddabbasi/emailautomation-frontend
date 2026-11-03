export function simulationShouldBlock(method: string, url: string): boolean {
  let path = url;
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) path = new URL(url).pathname;
  } catch {
    return false;
  }
  const pathname = path.split("?")[0] ?? "";
  if (!pathname.startsWith("/api/")) return false;
  const verb = method.toUpperCase();
  return verb !== "GET" && verb !== "HEAD";
}

export function installFetchGuard(current: typeof fetch): () => void {
  const guarded: typeof fetch = (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    if (simulationShouldBlock(method, url)) {
      return Promise.resolve(
        new Response(JSON.stringify({ error: "The simulation does not save or send." }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
    return current(input, init);
  };
  window.fetch = guarded;
  return () => {
    window.fetch = current;
  };
}
