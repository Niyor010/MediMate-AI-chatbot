// src/hooks/useFindDoctors.ts
// Reusable hook to fetch nearby doctors using Geoapify

import { useState } from "react";

const GEOAPIFY_KEY = "8d773395039548c2b4a7b7f3731d8753"; 

export interface NearbyDoctor {
  place_id: string;
  name: string;
  address: string;
  distance?: number;
  phone?: string;
  lat: number;
  lon: number;
}

export function useFindDoctors() {
  const [doctors, setDoctors]           = useState<NearbyDoctor[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const fetchDoctors = async (category = "healthcare.clinic_or_praxis") => {
    setLoading(true);
    setError(null);
    setDoctors([]);
    setLocationDenied(false);

    // Step 1 — get user location
    let lat: number, lon: number;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
        })
      );
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
      console.log("📍 User location:", lat, lon);
    } catch (err) {
      console.error("Location error:", err);
      setLocationDenied(true);
      setLoading(false);
      setError("Location access denied. Please allow location in your browser.");
      return;
    }

    // Step 2 — fetch from Geoapify
    try {
      const url =
        `https://api.geoapify.com/v2/places` +
        `?categories=${encodeURIComponent(category)}` +
        `&filter=circle:${lon},${lat},5000` +
        `&bias=proximity:${lon},${lat}` +
        `&limit=5` +
        `&apiKey=${GEOAPIFY_KEY}`;

      console.log("🔍 Fetching doctors from:", url);
      const res  = await fetch(url);
      const data = await res.json();
      console.log("📦 Geoapify response:", data);

      if (!data.features || data.features.length === 0) {
        setError("No clinics found within 5km. Try the Find Doctor page.");
        setLoading(false);
        return;
      }

      const results: NearbyDoctor[] = data.features
        .map((f: any) => ({
          place_id: f.properties.place_id || `${Math.random()}`,
          name:     f.properties.name || f.properties.address_line1 || "Clinic",
          address:  f.properties.formatted || f.properties.address_line2 || "",
          distance: f.properties.distance,
          phone:    f.properties.contact?.phone || f.properties.phone,
          lat:      f.geometry.coordinates[1],
          lon:      f.geometry.coordinates[0],
        }))
        .filter((d: NearbyDoctor) => d.name && d.address);

      console.log("✅ Doctors found:", results.length);
      setDoctors(results);
    } catch (err: any) {
      console.error("Geoapify fetch error:", err);
      setError("Failed to fetch nearby doctors. Check your API key.");
    } finally {
      setLoading(false);
    }
  };

  return { doctors, loading, error, locationDenied, fetchDoctors };
}