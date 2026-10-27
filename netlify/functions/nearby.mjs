// NAVI MY Nearby Places — Geoapify
// Path: netlify/functions/nearby.mjs

export default async (request) => {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 || lat > 90 ||
    lon < -180 || lon > 180
  ) {
    return Response.json(
      { error: "Koordinat lokasi tidak sah." },
      { status: 400 }
    );
  }

  if (!apiKey) {
    return Response.json(
      { error: "API key Geoapify belum tersedia pada fungsi Netlify." },
      { status: 500 }
    );
  }

  const categories = [
    "tourism",
    "leisure",
    "entertainment",
    "commercial",
    "accommodation",
    "catering",
    "parking"
  ].join(",");

  const params = new URLSearchParams({
    categories,
    filter: `circle:${lon},${lat},1200`,
    bias: `proximity:${lon},${lat}`,
    limit: "20",
    apiKey
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(
      `https://api.geoapify.com/v2/places?${params}`,
      {
        headers: { Accept: "application/json" },
        signal: controller.signal
      }
    );

    if (!response.ok) {
      return Response.json(
        {
          error: "Carian Geoapify gagal.",
          upstreamStatus: response.status
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!Array.isArray(data.features)) {
      return Response.json(
        { error: "Respons Geoapify tidak sah." },
        { status: 502 }
      );
    }

    const elements = data.features
      .map((feature) => {
        const p = feature.properties || {};
        const name = p.name;

        if (
          !name ||
          !Number.isFinite(Number(p.lat)) ||
          !Number.isFinite(Number(p.lon))
        ) {
          return null;
        }

        const tags = { name };
        const cats = Array.isArray(p.categories)
          ? p.categories
          : [];

        for (const category of cats) {
          const [group, ...rest] = category.split(".");
          const value = rest.join(".") || group;

          if (group === "tourism") tags.tourism = value;
          if (group === "leisure") tags.leisure = value;
          if (group === "catering") tags.amenity = value;
          if (group === "commercial") tags.shop = value;
          if (group === "accommodation") tags.tourism = value;
          if (group === "entertainment") tags.leisure = value;
          if (group === "parking") tags.amenity = "parking";
        }

        return {
          lat: Number(p.lat),
          lon: Number(p.lon),
          tags
        };
      })
      .filter(Boolean);

    return Response.json(
      { elements },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  } catch (error) {
    const message = error.name === "AbortError"
      ? "Carian Geoapify mengambil masa terlalu lama."
      : "Tidak dapat menghubungi Geoapify.";

    return Response.json(
      { error: message },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }
};
