import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import {
  Search, MapPin, Star, Navigation, Phone,
  ArrowLeft, Loader2, X, Clock, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Replace with your Geoapify API key ────────────────────────────────────
// Get free key at: https://myprojects.geoapify.com
const GEOAPIFY_KEY = "8d773395039548c2b4a7b7f3731d8753";

// ── Specialty filters ──────────────────────────────────────────────────────
const SPECIALTIES = [
  { label: "All Doctors",     category: "healthcare.hospital|healthcare.clinic_or_praxis" },
  { label: "🏥 Hospital",     category: "healthcare.hospital"           },
  { label: "🏨 Clinic",       category: "healthcare.clinic_or_praxis"   },
  { label: "🦷 Dentist",      category: "healthcare.dentist"            },
  { label: "💊 Pharmacy",     category: "healthcare.pharmacy"           },
  { label: "🧬 Laboratory",   category: "healthcare.laboratory"         },
  { label: "🚑 Emergency",    category: "healthcare.emergency"          },
  { label: "👁️ Optometrist",  category: "healthcare.optometrist"        },
  { label: "🧘 Rehab",        category: "healthcare.rehabilitation"     },
];

interface Doctor {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  categories: string[];
  distance?: number;
  phone?: string;
  website?: string;
  opening_hours?: string;
  rating?: number;
}

const FindDoctor = () => {
  const navigate                          = useNavigate();
  const [position, setPosition]           = useState<{ lat: number; lon: number } | null>(null);
  const [doctors, setDoctors]             = useState<Doctor[]>([]);
  const [filtered, setFiltered]           = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery]     = useState("");
  const [activeSpec, setActiveSpec]       = useState(SPECIALTIES[0].category);
  const [isLoading, setIsLoading]         = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [mapReady, setMapReady]           = useState(false);
  const mapRef                            = useRef<any>(null);
  const mapInstanceRef                    = useRef<any>(null);
  const markersRef                        = useRef<any[]>([]);

  // ── Get user location ────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) { setLocationError(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => setLocationError(true),
      { enableHighAccuracy: true }
    );
  }, []);

  // ── Load Leaflet map (free, no API key needed) ───────────────────────────
  useEffect(() => {
    if (!position || mapInstanceRef.current) return;

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id   = "leaflet-css";
      link.rel  = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const script = document.createElement("script");
    script.src   = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const L = (window as any).L;
      const map = L.map("find-doctor-map").setView([position.lat, position.lon], 14);

      // OpenStreetMap tiles (free)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // User location marker
      const userIcon = L.divIcon({
        html: `<div style="width:18px;height:18px;background:#7c3aed;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(124,58,237,0.5)"></div>`,
        iconSize: [18, 18],
        className: "",
      });
      L.marker([position.lat, position.lon], { icon: userIcon })
        .addTo(map)
        .bindPopup("<b>📍 You are here</b>");

      mapInstanceRef.current = map;
      setMapReady(true);
    };
    document.body.appendChild(script);

    return () => { document.body.removeChild(script); };
  }, [position]);

  // ── Fetch doctors from Geoapify ──────────────────────────────────────────
  const fetchDoctors = useCallback(async (category: string, query: string = "") => {
    if (!position) return;
    setIsLoading(true);
    setDoctors([]);
    setFiltered([]);
    setSelectedDoctor(null);

    try {
      let url = "";

      if (query.trim()) {
        // Text search
        url = `https://api.geoapify.com/v1/geocode/search?` +
          `text=${encodeURIComponent(query + " doctor clinic hospital")}` +
          `&bias=proximity:${position.lon},${position.lat}` +
          `&filter=circle:${position.lon},${position.lat},10000` +
          `&limit=20&apiKey=${GEOAPIFY_KEY}`;
      } else {
        // Category search
        url = `https://api.geoapify.com/v2/places?` +
          `categories=${encodeURIComponent(category)}` +
          `&filter=circle:${position.lon},${position.lat},5000` +
          `&bias=proximity:${position.lon},${position.lat}` +
          `&limit=30&apiKey=${GEOAPIFY_KEY}`;
      }

      const res  = await fetch(url);
      const data = await res.json();

      const features = data.features || [];
      const results: Doctor[] = features.map((f: any) => ({
        place_id:      f.properties.place_id || Math.random().toString(),
        name:          f.properties.name || f.properties.address_line1 || "Unknown",
        address:       f.properties.formatted || f.properties.address_line2 || "",
        lat:           f.geometry.coordinates[1],
        lon:           f.geometry.coordinates[0],
        categories:    f.properties.categories || [],
        distance:      f.properties.distance,
        phone:         f.properties.contact?.phone,
        website:       f.properties.website,
        opening_hours: f.properties.opening_hours,
      })).filter((d: Doctor) => d.name && d.name !== "Unknown");

      setDoctors(results);
      setFiltered(results);

      // Update map markers
      updateMarkers(results);

    } catch (err) {
      console.error("Geoapify error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [position, mapReady]);

  // ── Update map markers ────────────────────────────────────────────────────
  const updateMarkers = (results: Doctor[]) => {
    const L = (window as any).L;
    if (!mapInstanceRef.current || !L) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    results.forEach((doc, i) => {
      const icon = L.divIcon({
        html: `<div style="
          width:14px;height:14px;
          background:#3b82f6;
          border:2px solid white;
          border-radius:50%;
          box-shadow:0 2px 6px rgba(59,130,246,0.5);
          cursor:pointer;
        "></div>`,
        iconSize: [14, 14],
        className: "",
      });

      const marker = L.marker([doc.lat, doc.lon], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="min-width:160px;font-family:sans-serif">
            <b style="font-size:13px">${doc.name}</b><br/>
            <span style="font-size:11px;color:#666">📍 ${doc.address}</span><br/>
            ${doc.distance ? `<span style="font-size:11px;color:#888">🚶 ${(doc.distance/1000).toFixed(1)}km away</span><br/>` : ""}
            ${doc.phone ? `<span style="font-size:11px">📞 ${doc.phone}</span><br/>` : ""}
            <a href="https://www.google.com/maps/dir/?api=1&destination=${doc.lat},${doc.lon}"
              target="_blank"
              style="display:inline-block;margin-top:6px;background:#7c3aed;color:white;padding:4px 10px;border-radius:6px;font-size:11px;text-decoration:none">
              🧭 Directions
            </a>
          </div>
        `);

      marker.on("click", () => setSelectedDoctor(doc));
      markersRef.current.push(marker);
    });

    // Fit map to markers
    if (results.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  // ── Initial fetch when map ready ─────────────────────────────────────────
  useEffect(() => {
    if (mapReady && position) fetchDoctors(activeSpec);
  }, [mapReady]);

  // ── Filter client-side by search ─────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) { setFiltered(doctors); return; }
    const q = searchQuery.toLowerCase();
    setFiltered(doctors.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.address.toLowerCase().includes(q)
    ));
  }, [searchQuery, doctors]);

  // ── Pan map to selected doctor ────────────────────────────────────────────
  useEffect(() => {
    if (selectedDoctor && mapInstanceRef.current) {
      mapInstanceRef.current.setView([selectedDoctor.lat, selectedDoctor.lon], 17);
      // Open that marker's popup
      const idx = filtered.findIndex(d => d.place_id === selectedDoctor.place_id);
      if (markersRef.current[idx]) markersRef.current[idx].openPopup();
    }
  }, [selectedDoctor]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors(activeSpec, searchQuery);
  };

  const handleSpecialty = (category: string) => {
    setActiveSpec(category);
    setSearchQuery("");
    fetchDoctors(category);
  };

  const getDirections = (doc: Doctor) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${doc.lat},${doc.lon}`, "_blank");
  };

  const getCategoryLabel = (categories: string[]) => {
    const cat = categories[0] || "";
    if (cat.includes("hospital"))   return "🏥 Hospital";
    if (cat.includes("dentist"))    return "🦷 Dentist";
    if (cat.includes("pharmacy"))   return "💊 Pharmacy";
    if (cat.includes("clinic"))     return "🏨 Clinic";
    if (cat.includes("emergency"))  return "🚑 Emergency";
    if (cat.includes("optometrist"))return "👁️ Optometrist";
    return "🩺 Healthcare";
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-3 z-20">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/chat")} className="gap-1.5 h-8">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-foreground">Find a Doctor</h1>
              <p className="text-[10px] text-muted-foreground">Search clinics & doctors near you</p>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search doctor name, clinic, specialty..."
              className="pl-9 h-9 text-sm rounded-xl bg-muted/50 border-border"
            />
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(""); setFiltered(doctors); }}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button type="submit" size="sm" className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </form>

        {/* Specialty chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {SPECIALTIES.map(s => (
            <button
              key={s.category}
              onClick={() => handleSpecialty(s.category)}
              className={cn(
                "flex-shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-200 whitespace-nowrap",
                activeSpec === s.category
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left — Doctor list ── */}
        <div className="w-80 flex-shrink-0 border-r border-border flex flex-col overflow-hidden bg-background">

          {/* Count bar */}
          <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-muted-foreground font-medium">
              {isLoading ? "Searching..." : `${filtered.length} results found`}
            </span>
            {position && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" /> Within 5km
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Loading */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Finding nearby doctors...</p>
              </div>
            )}

            {/* Location error */}
            {locationError && (
              <div className="m-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
                ❌ Location access denied. Please allow location and refresh.
              </div>
            )}

            {/* No results */}
            {!isLoading && !locationError && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-2 px-4 text-center">
                <MapPin className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">No results found</p>
                <p className="text-xs text-muted-foreground">Try a different search or specialty filter</p>
              </div>
            )}

            {/* Doctor cards */}
            {!isLoading && filtered.map((doc) => (
              <div
                key={doc.place_id}
                onClick={() => setSelectedDoctor(doc)}
                className={cn(
                  "p-3 border-b border-border cursor-pointer transition-all duration-200 hover:bg-muted/40",
                  selectedDoctor?.place_id === doc.place_id && "bg-primary/5 border-l-2 border-l-primary"
                )}
              >
                {/* Name & category */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-2 flex-1">
                    {doc.name}
                  </h3>
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                    {getCategoryLabel(doc.categories)}
                  </span>
                </div>

                {/* Address */}
                <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {doc.address}
                </p>

                {/* Distance & phone */}
                <div className="flex items-center gap-3 mb-2">
                  {doc.distance && (
                    <span className="text-xs text-muted-foreground">
                      🚶 {(doc.distance / 1000).toFixed(1)}km away
                    </span>
                  )}
                  {doc.phone && (
                    <span className="text-xs text-muted-foreground">
                      📞 {doc.phone}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); getDirections(doc); }}
                    className="flex-1 h-7 text-xs gap-1 bg-primary hover:bg-primary/90 rounded-lg"
                  >
                    <Navigation className="w-3 h-3" />
                    Directions
                  </Button>
                  {doc.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); window.open(`tel:${doc.phone}`); }}
                      className="flex-1 h-7 text-xs gap-1 rounded-lg"
                    >
                      <Phone className="w-3 h-3" />
                      Call
                    </Button>
                  )}
                  {doc.website && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); window.open(doc.website, "_blank"); }}
                      className="h-7 text-xs px-2 rounded-lg"
                    >
                      🌐
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right — Leaflet Map ── */}
        <div className="flex-1 relative">
          {/* Location loading overlay */}
          {!position && !locationError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/20 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Getting your location...</p>
            </div>
          )}

          {/* Location error overlay */}
          {locationError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 p-8 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground" />
              <p className="text-base font-semibold text-foreground">Location Access Required</p>
              <p className="text-sm text-muted-foreground">Please allow location access in your browser to find doctors near you.</p>
              <Button onClick={() => window.location.reload()} className="bg-primary hover:bg-primary/90">
                Retry
              </Button>
            </div>
          )}

          {/* Map container */}
          <div id="find-doctor-map" className="w-full h-full" />

          {/* Selected doctor info bar at bottom of map */}
          {selectedDoctor && (
            <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur border border-border rounded-2xl p-4 shadow-xl z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-sm truncate">{selectedDoctor.name}</h3>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{selectedDoctor.address}</p>
                  {selectedDoctor.distance && (
                    <p className="text-xs text-primary mt-0.5">🚶 {(selectedDoctor.distance/1000).toFixed(1)}km away</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" onClick={() => getDirections(selectedDoctor)}
                    className="h-8 text-xs bg-primary hover:bg-primary/90 gap-1 rounded-xl">
                    <Navigation className="w-3 h-3" /> Go
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedDoctor(null)}
                    className="h-8 w-8 p-0 rounded-xl">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindDoctor;