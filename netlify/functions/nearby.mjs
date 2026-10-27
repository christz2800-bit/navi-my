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

  // Small query and bounded requests to keep the function within its deadline.
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

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "Accept": "application/json",
          "User-Agent": "NAVI-MY/0.7.7 nearby places"
        },
        body: "data=" + encodeURIComponent(query),
        signal: controller.signal
      });

      if (!response.ok) {
        failures.push(`${new URL(endpoint).hostname}: HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.elements)) {
        failures.push(`${new URL(endpoint).hostname}: respons JSON tidak sah`);
        continue;
      }

      return Response.json(data, {
        headers: { "Cache-Control": "public, max-age=30" }
      });
    } catch (error) {
      const host = new URL(endpoint).hostname;
      failures.push(
        error?.name === "AbortError"
          ? `${host}: timeout selepas 6.5 saat`
          : `${host}: ${error?.message || "ralat sambungan"}`
      );
    } finally {
      clearTimeout(timer);
    }
  }

  return Response.json(
    {
      error: "Semua pelayan Overpass gagal memberi respons.",
      details: failures
    },
    { status: 502 }
  );
};
