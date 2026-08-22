"use client";

import React, { useEffect, useRef, useState, useId } from "react";

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  draggable?: boolean;
  onPositionChange?: (lat: number, lng: number) => void;
}

export default function PropertyMap({
  latitude,
  longitude,
  zoom = 13,
  draggable = false,
  onPositionChange
}: PropertyMapProps) {
  const mapId = useId();
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Check if leaflet is already loaded
    if ((window as any).L) {
      setLoaded(true);
      return;
    }

    // Inject CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Inject JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      setLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    const L = (window as any).L;
    if (!L) return;

    // If map already exists, just update marker/center
    if (mapRef.current) {
      const newLatLng = [latitude, longitude];
      mapRef.current.setView(newLatLng, mapRef.current.getZoom());
      if (markerRef.current) {
        markerRef.current.setLatLng(newLatLng);
      }
      return;
    }

    // Initialize map
    const map = L.map(mapId).setView([latitude, longitude], zoom);
    mapRef.current = map;

    // Load tiles (standard light layout or neutral styles)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Set custom/default icon
    const markerIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Create marker
    const marker = L.marker([latitude, longitude], {
      draggable,
      icon: markerIcon
    }).addTo(map);
    markerRef.current = marker;

    if (draggable && onPositionChange) {
      marker.on("dragend", () => {
        const latLng = marker.getLatLng();
        onPositionChange(latLng.lat, latLng.lng);
      });

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        onPositionChange(lat, lng);
      });
    }

    return () => {
      // Clean up map instance on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [loaded, latitude, longitude, draggable, zoom]);

  return (
    <div 
      id={mapId} 
      className="w-full h-full min-h-[300px] rounded-3xl overflow-hidden shadow-inner border border-zinc-200 dark:border-zinc-800"
    />
  );
}
