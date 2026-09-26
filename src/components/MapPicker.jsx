import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickCatcher({ onPick }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

export default function MapPicker({ position, onPick, height = '420px', center = [15, 75], zoom = 4 }) {
  return (
    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,170,255,0.2)', boxShadow: '0 0 30px rgba(0,200,255,0.08)' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onPick && <ClickCatcher onPick={onPick} />}
        {position && <Marker position={position} icon={defaultIcon} />}
      </MapContainer>
    </div>
  );
}
