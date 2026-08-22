import axios from "axios";
import GeodataCache from "../models/geodataCache";
import { logger } from "../utils/logger";

const WEATHER_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const ATTRACTIONS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Helper to generate a cache key clustered to ~1.1km grid
function getGeoKey(lat: number, lng: number, type: string) {
  const roundedLat = lat.toFixed(2);
  const roundedLng = lng.toFixed(2);
  return `${type}-${roundedLat}-${roundedLng}`;
}

export async function getCachedWeather(lat: number, lng: number) {
  const key = getGeoKey(lat, lng, "weather");
  
  try {
    const cached = await GeodataCache.findOne({ key });
    if (cached && Date.now() - cached.updatedAt.getTime() < WEATHER_TTL_MS) {
      return cached.data;
    }

    // Cache miss or expired - fetch from Open-Meteo
    logger.info(`Fetching weather forecast from Open-Meteo for [${lat}, ${lng}]`);
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`,
      { timeout: 8000 }
    );

    const weatherData = response.data;
    if (weatherData && weatherData.current_weather) {
      await GeodataCache.findOneAndUpdate(
        { key },
        { key, type: "weather", data: weatherData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return weatherData;
    }
  } catch (err: any) {
    logger.warn(`Failed to fetch weather from Open-Meteo: ${err.message}.`);
  }

  // Fallback data: return null to indicate weather is temporarily unavailable
  return null;
}

export async function getCachedAttractions(lat: number, lng: number, city = "Goa", country = "India") {
  const key = getGeoKey(lat, lng, "attractions");

  try {
    const cached = await GeodataCache.findOne({ key });
    if (cached && Date.now() - cached.updatedAt.getTime() < ATTRACTIONS_TTL_MS) {
      return cached.data;
    }

    // Cache miss - query OSM Overpass API
    logger.info(`Fetching nearby attractions from Overpass for [${lat}, ${lng}]`);
    
    // Find tourist features and dining places within 3km
    const overpassQuery = `[out:json][timeout:8];(node(around:3000,${lat},${lng})["tourism"~"attraction|viewpoint|museum|theme_park"];node(around:1500,${lat},${lng})["amenity"~"restaurant|cafe|bar"];);out 10;`;
    const response = await axios.post(
      "https://overpass-api.de/api/interpreter",
      `data=${encodeURIComponent(overpassQuery)}`,
      {
        headers: {
          "User-Agent": "StaySmart-Vacation-Rentals/1.0",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 8000
      }
    );

    if (response.data && response.data.elements) {
      const attractions = response.data.elements.map((el: any) => ({
        id: String(el.id),
        name: el.tags.name || el.tags.tourism || el.tags.amenity || "Local Point of Interest",
        type: el.tags.tourism ? "Tourism" : "Dining",
        distance: "Nearby", // Can calculate exactly or show as relative nearby
        details: el.tags.cuisine ? `${el.tags.cuisine} cuisine` : el.tags.tourism || el.tags.amenity
      })).filter((el: any) => el.name !== "Local Point of Interest");

      if (attractions.length > 0) {
        await GeodataCache.findOneAndUpdate(
          { key },
          { key, type: "attractions", data: attractions },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return attractions;
      }
    }
  } catch (err: any) {
    logger.warn(`Failed to fetch attractions from Overpass: ${err.message}.`);
  }

  // Fallback data: return realistic city attractions to avoid empty screens
  return getCityFallback(city);
}

const LOCAL_FALLBACKS: Record<string, Array<{ name: string; type: string; details: string }>> = {
  goa: [
    { name: "Calangute Beach", type: "Tourism", details: "Popular sandy beach & watersports" },
    { name: "Fort Aguada", type: "Tourism", details: "17th-century Portuguese lighthouse & fort" },
    { name: "Brittos Bar & Restaurant", type: "Dining", details: "Seafood & local Goan cuisine" },
    { name: "Curlies Beach Shack", type: "Dining", details: "Beachside dining & sunset views" }
  ],
  mumbai: [
    { name: "Gateway of India", type: "Tourism", details: "Iconic 20th-century arch monument" },
    { name: "Marine Drive", type: "Tourism", details: "Scenic seaside promenade" },
    { name: "Leopold Cafe", type: "Dining", details: "Historic multi-cuisine cafe & bar" },
    { name: "Bademiya", type: "Dining", details: "Famous street food & kebabs" }
  ],
  delhi: [
    { name: "Red Fort", type: "Tourism", details: "Historic Mughal fortress & museum" },
    { name: "Qutub Minar", type: "Tourism", details: "Tallest brick minaret in the world" },
    { name: "Karim's", type: "Dining", details: "Famous Mughlai dining spot" },
    { name: "Indian Accent", type: "Dining", details: "Award-winning modern Indian cuisine" }
  ]
};

function getCityFallback(city: string) {
  const norm = (city || "").toLowerCase().trim();
  if (LOCAL_FALLBACKS[norm]) {
    return LOCAL_FALLBACKS[norm].map((item, i) => ({
      id: `fallback_${norm}_${i}`,
      name: item.name,
      type: item.type,
      distance: "1.2 km",
      details: item.details
    }));
  }
  return [
    { id: "fallback_gen_1", name: "Scenic Viewpoint", type: "Tourism", distance: "850 m", details: "Natural scenic overlook" },
    { id: "fallback_gen_2", name: "Local Heritage Site", type: "Tourism", distance: "1.5 km", details: "Historical point of interest" },
    { id: "fallback_gen_3", name: "The Local Bistro", type: "Dining", distance: "450 m", details: "Fresh local ingredients & coffee" }
  ];
}
