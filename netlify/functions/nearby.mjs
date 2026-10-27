// NAVI MY Nearby Places proxy for Netlify Functions
// Path: netlify/functions/nearby.mjs
export default async (request) => {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
      lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return Response.json(
      { error: "Koordinat lokasi tidak sah." },
      { status: 400 }
    );
  }

  // Modest query; race public Overpass mirrors instead of waiting one by one.
  const query =
    `[out:json][timeout:6];(` +
    `nwr(around:1000,${lat},${lon})[name][tourism];` +
    `nwr(around:1000,${lat},${lon})[name][leisure];` +
    `nwr(around:1000,${lat},${lon})[name][amenity];` +
    `nwr(around:1000,${lat},${lon})[name][shop];` +
    `);out center 20;`;

  const endpoints = [
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter"
  ];

  const failures = [];
  const controllers = [];
  const timers = [];

  try {
    const attempts = endpoints.map(async (endpoint) => {
      const controller = new AbortController();
      controllers.push(controller);
      const timer = setTimeout(() => controller.abort(), 7000);
      timers.push(timer);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "Accept": "application/json",
            "User-Agent": "NAVI-MY/0.7.8 nearby places"
          },
          body: "data=" + encodeURIComponent(query),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.elements)) {
          throw new Error("respons JSON tidak sah");
        }
        return data;
      } catch (error) {
        const host = new URL(endpoint).hostname;
        const reason = error?.name === "AbortError"
          ? "timeout selepas 7 saat"
          : (error?.message || "ralat sambungan");
        failures.push(`${host}: ${reason}`);
        throw error;
      } finally {
        clearTimeout(timer);
      }
    });

    const data = await Promise.any(attempts);
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=30" }
    });
  } catch {
    return Response.json(
      {
        error: "Semua pelayan Overpass gagal memberi respons.",
        details: failures
      },
      { status: 502 }
    );
  } finally {
    for (const controller of controllers) controller.abort();
    for (const timer of timers) clearTimeout(timer);
  }
};
