import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DROP = new Set(["connection", "keep-alive", "transfer-encoding", "host", "content-length", "content-encoding"]);

async function forward(request: NextRequest, path: string[] | undefined) {
  const backend = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backend) {
    return NextResponse.json({ error: "BACKEND_URL is not set on the frontend" }, { status: 500 });
  }

  const target = new URL(`${backend}/api/${(path ?? []).join("/")}`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!DROP.has(key.toLowerCase())) headers.set(key, value);
  });

  const init: RequestInit = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (DROP.has(key.toLowerCase()) || key.toLowerCase() === "set-cookie") return;
    responseHeaders.set(key, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
}

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, context: Context) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function POST(request: NextRequest, context: Context) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function PUT(request: NextRequest, context: Context) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function PATCH(request: NextRequest, context: Context) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function DELETE(request: NextRequest, context: Context) {
  const { path } = await context.params;
  return forward(request, path);
}
