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

  // Keep the query modest to reduce the chance of an Overpass timeout.
  const query =
    `[out:json][timeout:8];(` +
    `nwr(around:1000,${lat},${lon})[name][tourism];` +
    `nwr(around:1000,${lat},${lon})[name][leisure];` +
    `nwr(around:1000,${lat},${lon})[name][amenity];` +
    `nwr(around:1000,${lat},${lon})[name][shop];` +
    `);out center 20;`;

  // Two endpoints only: the browser request has a 25-second deadline.
  const endpoints = [
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
  ];

  let lastError = "Tiada pelayan Overpass dapat dicapai.";
  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "Accept": "application/json",
          "User-Agent": "NAVI-MY/0.7.6 nearby places"
        },
        body: "data=" + encodeURIComponent(query),
        signal: controller.signal
      });

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
        ? "Pelayan Overpass melebihi had 9 saat."
        : (error?.message || "Ralat sambungan ke Overpass.");
    } finally {
      clearTimeout(timer);
    }
  }

  return Response.json({ error: lastError }, { status: 502 });
};
