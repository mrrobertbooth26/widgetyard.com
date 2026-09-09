const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

const clean = (value) => value === undefined || value === null || value === "" ? null : value;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
