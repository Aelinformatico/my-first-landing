export async function GET() {
  const apiKey = process.env.AGROMONITORING_API_KEY;
  const polygonId = process.env.AGROMONITORING_SOURCE_POLYGON_ID;

  if (!apiKey || !polygonId) {
    return Response.json(
      { error: "Agromonitoring requires an API key and the Fuente polygon ID." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL("https://api.agromonitoring.com/agro/1.0/soil");
  url.searchParams.set("polyid", polygonId);
  url.searchParams.set("appid", apiKey);

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return Response.json(
        { error: "Agromonitoring soil data is unavailable." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const data: unknown = await response.json();
    const soilData = typeof data === "object" && data !== null
      ? data as { moisture?: unknown }
      : undefined;
    if (typeof soilData?.moisture !== "number") {
      return Response.json(
        { error: "Agromonitoring returned no soil moisture." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(
      { moisture: soilData.moisture },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Could not connect to Agromonitoring." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}