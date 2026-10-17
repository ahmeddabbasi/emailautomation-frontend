"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { reportClientError } from "@/lib/client-log";

const LOG_ENDPOINT = "/api/logs/client";
let fetchPatched = false;
let onUnauthorized: () => void = () => {};

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

// Every failed call to our own API from anywhere in the UI is reported, so
// components don't each need their own logging. A 401 means the session
// expired mid-use: send the user to log in rather than leave a broken page.
function patchFetch() {
  if (fetchPatched) return;
  fetchPatched = true;
  const original = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = requestUrl(input);
    const path = new URL(url, window.location.origin).pathname;
    const isOwnApi = path.startsWith("/api/") && path !== LOG_ENDPOINT;
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

    let res: Response;
    try {
      res = await original(input, init);
    } catch (err) {
      if (isOwnApi) {
        reportClientError({
          code: "API_NETWORK_ERROR",
          message: `Request to ${path} failed before reaching the server`,
          details: { requestPath: path, requestMethod: method, error: err instanceof Error ? err.message : String(err) },
        });
      }
      throw err;
    }

    if (isOwnApi && res.status === 401 && path !== "/api/auth/login") {
      onUnauthorized();
      return res;
    }
    if (isOwnApi && !res.ok && path !== "/api/auth/login") {
      res
        .clone()
        .json()
        .catch(() => ({}))
        .then((body: { error?: string }) =>
          reportClientError({
            code: `API_HTTP_${res.status}`,
            level: res.status >= 500 ? "error" : "warning",
            message: `${method} ${path} failed: ${body.error ?? res.statusText ?? "no error message"}`,
            details: { requestPath: path, requestMethod: method, httpStatus: res.status, responseError: body.error ?? null },
          })
        );
    }
    return res;
  };
}

export function ClientErrorReporter() {
  const router = useRouter();

  useEffect(() => {
    onUnauthorized = () => router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }, [router]);

  useEffect(() => {
    patchFetch();

    function onError(event: ErrorEvent) {
      reportClientError({
        code: "UNHANDLED_CLIENT_ERROR",
        message: event.message || "Unhandled error in the browser",
        stack: event.error instanceof Error ? event.error.stack : undefined,
        details: { file: event.filename, line: event.lineno, column: event.colno },
      });
    }
    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      reportClientError({
        code: "UNHANDLED_PROMISE_REJECTION",
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
