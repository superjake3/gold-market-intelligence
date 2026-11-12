const GITHUB_API = "https://api.github.com";
const REPOSITORY = "superjake3/gold-market-intelligence";
const WORKFLOW = "update-live-market.yml";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://superjake3.github.io";
    const cors = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };

    if (origin !== allowedOrigin) {
      return new Response(JSON.stringify({ error: "Origin not allowed" }), {
        status: 403, headers: { "Content-Type": "application/json" }
      });
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...cors, "Content-Type": "application/json" }
      });
    }
    if (!env.GITHUB_TOKEN) {
      return new Response(JSON.stringify({ error: "Worker secret GITHUB_TOKEN is missing" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    try {
      const body = await request.json();
      if (body?.action !== "refresh") {
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" }
        });
      }
      const response = await fetch(
        `${GITHUB_API}/repos/${REPOSITORY}/actions/workflows/${WORKFLOW}/dispatches`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ ref: "main" })
        }
      );
      if (response.status !== 204) {
        const detail = await response.text();
        return new Response(JSON.stringify({
          error: "GitHub workflow dispatch failed",
          detail: detail.slice(0, 500),
          github_status: response.status
        }), {
          status: 502, headers: { ...cors, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ ok: true, message: "Market refresh workflow queued" }), {
        status: 202, headers: { ...cors, "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message || "Bad request" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" }
      });
    }
  }
};
