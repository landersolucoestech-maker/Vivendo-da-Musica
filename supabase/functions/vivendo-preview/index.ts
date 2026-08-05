import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FUNCTION_PREFIX = "/functions/v1/vivendo-preview";
const REPOSITORY = "landersolucoestech-maker/Vivendo-da-Musica";
const STATIC_BRANCH = "dev-preview-static";
const COMMIT_PATTERN = /^[0-9a-f]{40}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "access-control-allow-origin": "*",
      "cache-control": "no-store, max-age=0",
      "content-type": "application/json; charset=utf-8",
    },
  });

const resolveStaticCommit = async (): Promise<string> => {
  const response = await fetch(
    `https://api.github.com/repos/${REPOSITORY}/commits/${STATIC_BRANCH}`,
    {
      cache: "no-store",
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "Vivendo-da-Musica-Preview-Resolver/1.0",
        "x-github-api-version": "2022-11-28",
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub respondeu HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as { sha?: unknown };
  const sha = typeof payload.sha === "string" ? payload.sha : "";
  if (!COMMIT_PATTERN.test(sha)) {
    throw new Error("A branch estática não retornou um commit válido.");
  }

  return sha;
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, HEAD, OPTIONS",
        "cache-control": "no-store, max-age=0",
      },
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "Método não permitido." }, 405);
  }

  try {
    const incoming = new URL(request.url);
    const staticCommit = await resolveStaticCommit();
    const baseUrl = `https://rawcdn.githack.com/${REPOSITORY}/${staticCommit}/index.html`;

    if (incoming.searchParams.get("health") === "1") {
      return json({ ok: true, staticCommit, previewUrl: baseUrl });
    }

    const suffix = incoming.pathname.startsWith(FUNCTION_PREFIX)
      ? incoming.pathname.slice(FUNCTION_PREFIX.length).replace(/^\/+/, "")
      : "";
    const destination = suffix ? `${baseUrl}#/${suffix}` : baseUrl;
    return Response.redirect(destination, 307);
  } catch (error) {
    console.error("Unable to resolve the current preview", error);
    return json(
      { error: error instanceof Error ? error.message : "Preview indisponível." },
      503,
    );
  }
});
