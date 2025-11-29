import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { EnrichedEvent } from '../types';

// Fix for default Leaflet marker icons
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  events: EnrichedEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
}

const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, { duration: 1.5 });
  }, [center, map]);
  return null;
};

const MapSizer: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    invalidate(); // kick once on mount so tiles fill available area
    window.addEventListener('resize', invalidate);
    return () => window.removeEventListener('resize', invalidate);
  }, [map]);
  return null;
};

export const MapView: React.FC<MapViewProps> = ({ events, selectedEventId, onSelectEvent }) => {
  const selectedEvent = events.find(e => e.id === selectedEventId);
  const center: [number, number] = (selectedEvent && selectedEvent.location?.latitude && selectedEvent.location?.longitude)
    ? [selectedEvent.location.latitude, selectedEvent.location.longitude] 
    : [40.7580, -73.9855]; // Default to Midtown

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-inner border border-stone-200">
      <MapContainer 
        center={center} 
        zoom={12} 
        scrollWheelZoom={true} 
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapSizer />
        <MapController center={center} />
        
        {events.map((event) => {
          if (!event.location?.latitude || !event.location?.longitude) return null;
          
          return (
            <Marker 
              key={event.id} 
              position={[event.location.latitude, event.location.longitude]}
              eventHandlers={{
                click: () => onSelectEvent(event.id),
              }}
              opacity={selectedEventId && selectedEventId !== event.id ? 0.6 : 1}
            >
              <Popup className="font-sans">
                <div className="text-sm">
                  <h3 className="font-bold text-stone-800">{event.location.name}</h3>
                  <p className="text-xs text-stone-500 font-bold">{event.year}</p>
                  <p className="mt-1 font-semibold">{event.people.map(p => p.name).join(", ")}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
