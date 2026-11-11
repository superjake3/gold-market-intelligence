const ALLOWED_ORIGIN = "https://superjake3.github.io";
const GITHUB_API = "https://api.github.com";

function json(data, status, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Vary": "Origin"
    }
  });
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (origin !== ALLOWED_ORIGIN) {
      return json({ ok: false, error: "Origin not allowed" }, 403);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const authorization = request.headers.get("Authorization") || "";
    const suppliedSecret = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!env.REFRESH_SECRET || !constantTimeEqual(suppliedSecret, env.REFRESH_SECRET)) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    if (!env.GITHUB_TOKEN) {
      return json({ ok: false, error: "GitHub token is not configured" }, 500);
    }

    const dispatchUrl = GITHUB_API
      + "/repos/superjake3/gold-market-intelligence/actions/workflows/update-live-market.yml/dispatches";

    try {
      const response = await fetch(dispatchUrl, {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": "Bearer " + env.GITHUB_TOKEN,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ref: "main" })
      });

      if (response.status !== 204) {
        const detail = await response.text();
        console.error("GitHub dispatch failed:", response.status, detail.slice(0, 500));
        return json({ ok: false, error: "GitHub Actions 요청에 실패했습니다.", status: response.status }, 502);
      }

      return json({ ok: true, accepted: true, message: "시세 수집을 시작했습니다." }, 202);
    } catch (error) {
      console.error("Dispatch request error:", error);
      return json({ ok: false, error: "GitHub 연결 중 오류가 발생했습니다." }, 502);
    }
  }
};
