// NAVI MY Nearby Places proxy for Netlify Functions
// Path: netlify/functions/nearby.mjs
export default async (request) => {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
      lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return Response.json({ error: "Koordinat lokasi tidak sah." }, { status: 400 });
  }

  const query =
    `[out:json][timeout:15];(` +
    `nwr(around:1200,${lat},${lon})[name][tourism];` +
    `nwr(around:1200,${lat},${lon})[name][leisure];` +
    `nwr(around:1200,${lat},${lon})[name][amenity];` +
    `nwr(around:1200,${lat},${lon})[name][shop];` +
    `);out center 25;`;

  const endpoints = [
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter"
  ];

  let lastError = "Tiada pelayan Overpass dapat dicapai.";
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18000);
      let response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "Accept": "application/json",
            "User-Agent": "NAVI-MY/0.7.5 nearby places"
          },
          body: "data=" + encodeURIComponent(query),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        lastError = `Overpass HTTP ${response.status}`;
        continue;
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.elements)) {
        lastError = "Respons Overpass tidak sah.";
        continue;
      }

      return Response.json(data, {
        headers: { "Cache-Control": "public, max-age=30" }
      });
    } catch (error) {
      lastError = error?.name === "AbortError"
        ? "Pelayan Overpass mengambil masa terlalu lama."
        : (error?.message || "Ralat sambungan ke Overpass.");
    }
  }

  return Response.json({ error: lastError }, { status: 502 });
};
