import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FUNCTION_PREFIX = "/functions/v1/vivendo-preview";
const REPOSITORY = "landersolucoestech-maker/Vivendo-da-Musica";
const STATIC_BRANCH = "dev-preview-static";
const COMMIT_PATTERN = /^[0-9a-f]{40}$/i;
const STATIC_COMMIT_TTL_MS = 60_000;

interface StaticCommitCache {
  sha: string;
  expiresAt: number;
}

let staticCommitCache: StaticCommitCache | null = null;
let staticCommitRefresh: Promise<string> | null = null;

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

const fetchStaticCommit = async (): Promise<string> => {
  const githubToken = Deno.env.get("GITHUB_TOKEN")?.trim();
  const response = await fetch(
    `https://api.github.com/repos/${REPOSITORY}/commits/${STATIC_BRANCH}`,
    {
      cache: "no-store",
      headers: {
        accept: "application/vnd.github+json",
        ...(githubToken ? { authorization: `Bearer ${githubToken}` } : {}),
        "user-agent": "Vivendo-da-Musica-Preview-Resolver/1.1",
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

  staticCommitCache = {
    sha,
    expiresAt: Date.now() + STATIC_COMMIT_TTL_MS,
  };
  return sha;
};

const resolveStaticCommit = async (): Promise<string> => {
  const now = Date.now();
  if (staticCommitCache && staticCommitCache.expiresAt > now) {
    return staticCommitCache.sha;
  }

  if (!staticCommitRefresh) {
    staticCommitRefresh = fetchStaticCommit().finally(() => {
      staticCommitRefresh = null;
    });
  }

  try {
    return await staticCommitRefresh;
  } catch (error) {
    if (staticCommitCache && COMMIT_PATTERN.test(staticCommitCache.sha)) {
      console.warn("GitHub indisponível; usando o último commit estático conhecido.", error);
      return staticCommitCache.sha;
    }
    throw error;
  }
};

Deno.serve(async (request: Request) => {
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
    const destination = suffix ? `${baseUrl}#/${encodeURI(suffix)}` : baseUrl;
    return new Response(null, {
      status: 307,
      headers: {
        ...commonHeaders,
        location: destination,
      },
    });
  } catch (error) {
    console.error("Unable to resolve the current preview", error);
    return json(
      { error: error instanceof Error ? error.message : "Preview indisponível." },
      503,
    );
  }
});
