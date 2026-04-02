import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
  OverlayView,
} from "@react-google-maps/api";
import { useEffect, useState } from "react";

const containerStyle = {
  width: "100%",
  height: "60vh",
};

const FindDoctor = () => {
  const [position, setPosition] = useState<any>(null);
  const [places, setPlaces] = useState<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  // 📍 Get live location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        console.log("LIVE LOCATION:", location);
        setPosition(location);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  }, []);

  // 🏥 Fetch doctors/hospitals
  const fetchPlaces = () => {
    if (!position || !window.google) return;

    const service = new window.google.maps.places.PlacesService(
      document.createElement("div")
    );

    const request = {
      location: position,
      radius: 5000,
      keyword: "doctor",
    };

    service.nearbySearch(request, (results: any, status: any) => {
      if (status === "OK") {
        const filtered = results.filter((place: any) =>
            place.types.some((type: string) =>
            [
              "doctor",
              "hospital",
              "health",
              "pharmacy",
              "dentist",
              "physiotherapist",
            ].includes(type)
            )
            );
            setPlaces(filtered);
        }
    });
  };

  // 🔥 Run after map loads
  useEffect(() => {
    if (mapLoaded && position) {
      fetchPlaces();
    }
  }, [mapLoaded, position]);

  if (!position) return <p>📍 Getting your live location...</p>;

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <h2 style={{ padding: "10px" }}>🏥 Doctors Near You</h2>

      <LoadScript
        googleMapsApiKey="AIzaSyCXpa9fvY4a4Og0Wrmpl0Kc9QCTlcw3gSM"
        libraries={["places"]}
        onLoad={() => setMapLoaded(true)}
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={position}
          zoom={14}
        >
          {/* 📍 User location */}
          <Marker position={position} />

          {/* 🏥 Doctors */}
          {places.map((place, i) => (
            <div key={i}>
  {/* 🔴 Marker */}
  <Marker
    position={place.geometry.location}
    onClick={() => setSelectedPlace(place)}
    icon={{
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 6,
      fillColor: "red",
      fillOpacity: 1,
      strokeWeight: 1,
    }}
  />

  {/* 🔵 ALWAYS VISIBLE NAME */}
  <OverlayView
    position={place.geometry.location}
    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
  >
    <div
      style={{
        color: "blue",
        fontSize: "12px",
        fontWeight: "bold",
        background: "white",
        padding: "2px 6px",
        borderRadius: "6px",
        transform: "translate(-50%, -120%)",
        whiteSpace: "nowrap",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
      }}
    >
      {place.name}
    </div>
  </OverlayView>
</div>
          ))}

          {/* 📍 Info window (name + details) */}
          {selectedPlace && (
            <InfoWindow
              position={selectedPlace.geometry.location}
              onCloseClick={() => setSelectedPlace(null)}
            >
              <div>
                <h3>{selectedPlace.name}</h3>
                <p>⭐ {selectedPlace.rating || "N/A"}</p>
                <p>{selectedPlace.vicinity}</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>

      {/* 📋 Doctor cards */}
      <div style={{ padding: "10px" }}>
        {places.map((place, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "10px",
              background: "#1e1e1e",
              color: "white",
            }}
          >
            <h3>{place.name}</h3>
            <p>⭐ Rating: {place.rating || "N/A"}</p>
            <p>📍 {place.vicinity}</p>

            <div style={{ display: "flex", gap: "10px" }}>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat()},${place.geometry.location.lng()}`}
                target="_blank"
              >
                <button
                  style={{
                    padding: "6px 10px",
                    background: "green",
                    color: "white",
                    borderRadius: "5px",
                  }}
                >
                  🧭 Directions
                </button>
              </a>

              <button
                style={{
                  padding: "6px 10px",
                  background: "blue",
                  color: "white",
                  borderRadius: "5px",
                }}
              >
                📞 Call
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FindDoctor;