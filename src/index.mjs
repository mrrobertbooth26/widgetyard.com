const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

const clean = (value) => value === undefined || value === null || value === "" ? null : value;

const counterHeaders = {
  ...jsonHeaders,
  "Access-Control-Allow-Origin": "https://widgetyard.com",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

const counterStub = (env) => {
  const id = env.PAGE_COUNTER.idFromName("widgetyard-global-page-counter");
  return env.PAGE_COUNTER.get(id);
};

export class PageCounter {
  constructor(ctx) {
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS page_hits (
      path TEXT PRIMARY KEY,
      hits INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )`);
  }

  async fetch(request) {
    if (request.method === "POST") {
      const payload = await request.json().catch(() => ({}));
      const path = typeof payload.path === "string" ? payload.path.split(/[?#]/, 1)[0] : "";
      if (!/^\/[a-z0-9_./-]{0,160}$/i.test(path)) {
        return new Response(JSON.stringify({ error: "Invalid page path" }), { status: 400, headers: counterHeaders });
      }

      const updatedAt = new Date().toISOString();
      this.sql.exec(
        `INSERT INTO page_hits (path, hits, updated_at) VALUES (?, 1, ?)
         ON CONFLICT(path) DO UPDATE SET hits = hits + 1, updated_at = excluded.updated_at`,
        path,
        updatedAt,
      );
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }

    if (request.method === "GET" || request.method === "HEAD") {
      const pages = Array.from(this.sql.exec(
        "SELECT path, hits, updated_at AS updatedAt FROM page_hits ORDER BY hits DESC, path ASC",
      ));
      const total = pages.reduce((sum, page) => sum + Number(page.hits), 0);
      const payload = JSON.stringify({ total, pages });
      return new Response(request.method === "HEAD" ? null : payload, { headers: counterHeaders });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...counterHeaders, Allow: "GET, HEAD, POST" },
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/hit") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...jsonHeaders, Allow: "POST" },
        });
      }
      if (request.headers.get("Origin") !== url.origin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: jsonHeaders });
      }
      return counterStub(env).fetch(request);
    }

    if (url.pathname === "/api/hits") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...jsonHeaders, Allow: "GET, HEAD" },
        });
      }
      return counterStub(env).fetch(request);
    }

    if (url.pathname === "/api/ip") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...jsonHeaders, Allow: "GET, HEAD" },
        });
      }

      const cf = request.cf || {};
      const ip = clean(request.headers.get("CF-Connecting-IP"));
      const payload = {
        ip,
        ipVersion: ip ? (ip.includes(":") ? "IPv6" : "IPv4") : null,
        network: {
          asn: clean(cf.asn),
          organization: clean(cf.asOrganization),
        },
        location: {
          city: clean(cf.city),
          region: clean(cf.region),
          regionCode: clean(cf.regionCode),
          postalCode: clean(cf.postalCode),
          countryCode: clean(cf.country),
          continentCode: clean(cf.continent),
          latitude: clean(cf.latitude),
          longitude: clean(cf.longitude),
          timezone: clean(cf.timezone),
        },
        connection: {
          httpProtocol: clean(cf.httpProtocol),
          tlsVersion: clean(cf.tlsVersion),
          cloudflareColo: clean(cf.colo),
        },
      };

      return new Response(request.method === "HEAD" ? null : JSON.stringify(payload), {
        headers: jsonHeaders,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
