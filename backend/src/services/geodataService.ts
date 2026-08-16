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

  // Fallback data: return empty list to indicate attractions are temporarily unavailable
  return [];
}
