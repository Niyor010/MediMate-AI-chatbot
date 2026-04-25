// src/components/NearbyDoctorsPanel.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MapPin, Navigation, Phone, Loader2,
  ChevronRight, AlertCircle, Stethoscope,
} from "lucide-react";
import { useFindDoctors } from "@/hooks/useFindDoctors";

interface Props {
  disease: string;
  severity: string;
  category?: string;     // Geoapify category
  accentColor?: string;  // tailwind color e.g. "primary" or "pink-500"
}

export default function NearbyDoctorsPanel({
  disease,
  severity,
  category = "healthcare.clinic_or_praxis",
  accentColor = "primary",
}: Props) {
  const navigate = useNavigate();
  const { doctors, loading, error, locationDenied, fetchDoctors } = useFindDoctors();

  // Auto-fetch when component mounts
  useEffect(() => {
    if (severity !== "none") {
      fetchDoctors(category);
    }
  }, [disease, category]);

  const getDirections = (lat: number, lon: number) =>
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, "_blank");

  if (severity === "none") return null;

  const accent = accentColor === "primary" ? "text-primary" : `text-${accentColor}`;
  const accentBg = accentColor === "primary" ? "bg-primary/10" : `bg-${accentColor}/10`;
  const accentBtn = accentColor === "primary"
    ? "bg-primary hover:bg-primary/90"
    : `bg-${accentColor} hover:opacity-90`;

  return (
    <div className="bg-card border border-border rounded-3xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <MapPin className={`w-4 h-4 ${accent}`} />
          Nearby Specialists
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/find-doctor")}
          className={`text-xs ${accent} gap-1 h-7`}
        >
          View all <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-6">
          <Loader2 className={`w-5 h-5 animate-spin ${accent}`} />
          <span className="text-sm text-muted-foreground">Finding specialists near you...</span>
        </div>
      )}

      {/* Error / Location denied */}
      {!loading && (error || locationDenied) && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
          <Button
            size="sm"
            onClick={() => fetchDoctors(category)}
            className={`w-full rounded-xl gap-2 text-white ${accentBtn}`}
          >
            <MapPin className="w-3.5 h-3.5" /> Retry — Find Specialists
          </Button>
        </div>
      )}

      {/* No results */}
      {!loading && !error && doctors.length === 0 && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            No specialists found nearby automatically.
          </p>
          <Button
            size="sm"
            onClick={() => fetchDoctors(category)}
            className={`gap-2 rounded-xl text-white ${accentBtn}`}
          >
            <MapPin className="w-3.5 h-3.5" /> Find Specialists Near Me
          </Button>
        </div>
      )}

      {/* Doctor list */}
      {!loading && doctors.length > 0 && (
        <div className="space-y-3">
          {doctors.map((doc) => (
            <div
              key={doc.place_id}
              className="flex items-start gap-3 p-3 bg-muted/40 rounded-2xl hover:bg-muted/60 transition-colors"
            >
              {/* Icon */}
              <div className={`w-9 h-9 rounded-xl ${accentBg} flex items-center justify-center flex-shrink-0`}>
                <Stethoscope className={`w-4 h-4 ${accent}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{doc.address}</p>
                {doc.distance !== undefined && (
                  <p className={`text-xs mt-0.5 ${accent}`}>
                    🚶 {(doc.distance / 1000).toFixed(1)}km away
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <Button
                  size="sm"
                  onClick={() => getDirections(doc.lat, doc.lon)}
                  className={`h-7 text-xs px-2.5 rounded-lg gap-1 text-white ${accentBtn}`}
                >
                  <Navigation className="w-3 h-3" /> Go
                </Button>
                {doc.phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`tel:${doc.phone}`)}
                    className="h-7 text-xs px-2.5 rounded-lg gap-1"
                  >
                    <Phone className="w-3 h-3" /> Call
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* View more */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/find-doctor")}
            className="w-full rounded-xl gap-2 mt-1"
          >
            <MapPin className="w-3.5 h-3.5" />
            View More on Map
          </Button>
        </div>
      )}
    </div>
  );
}