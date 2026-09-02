import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FUNCTION_PREFIX = "/functions/v1/vivendo-preview";
const PREVIEW_BRANCH = "dev";
const PAGES_PREVIEW_URL = "https://landersolucoestech-maker.github.io/Vivendo-da-Musica/";

const commonHeaders = {
  "access-control-allow-origin": "*",
  "cache-control": "no-store, max-age=0",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...commonHeaders,
      "content-type": "application/json; charset=utf-8",
    },
  });

Deno.serve((request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...commonHeaders,
        "access-control-allow-methods": "GET, HEAD, OPTIONS",
      },
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "Método não permitido." }, 405);
  }

  const incoming = new URL(request.url);

  if (incoming.searchParams.get("health") === "1") {
    return json({
      ok: true,
      branch: PREVIEW_BRANCH,
      previewUrl: PAGES_PREVIEW_URL,
    });
  }

  const suffix = incoming.pathname.startsWith(FUNCTION_PREFIX)
    ? incoming.pathname.slice(FUNCTION_PREFIX.length).replace(/^\/+/, "")
    : "";
  const destination = suffix
    ? `${PAGES_PREVIEW_URL}#/${encodeURI(suffix)}`
    : PAGES_PREVIEW_URL;

  return new Response(null, {
    status: 307,
    headers: {
      ...commonHeaders,
      location: destination,
    },
  });
});
