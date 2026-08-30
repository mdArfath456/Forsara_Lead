import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { apiClient } from '../lib/apiClient';
import { LoadingState, EmptyState, ErrorState } from '../components/StatusStates';

// Leaflet's default marker icons reference image paths that don't resolve
// correctly under Vite's bundling — fixing this once here, app-wide.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER = [20.5937, 78.9629]; // India, sensible default given the target market

export default function MapPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['leads-map'],
    queryFn: () => apiClient.get('/leads', { params: { withLocation: 'true', limit: 500 } }).then((r) => r.data.leads),
  });

  if (isLoading) return <LoadingState label="Loading lead locations…" />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const withCoords = data.filter((l) => l.location?.coordinates?.length === 2);

  if (withCoords.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Map View</h1>
        <EmptyState
          title="No mapped leads yet"
          description="Leads from Google Places/Foursquare discovery include coordinates automatically — run a search to see them here."
        />
      </div>
    );
  }

  const center = withCoords[0].location.coordinates.slice().reverse(); // [lng, lat] -> [lat, lng]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Map View</h1>
        <p className="text-sm text-gray-500">{withCoords.length} leads with location data.</p>
      </div>

      <div className="rounded-2xl overflow-hidden glass-panel" style={{ height: '65vh' }}>
        <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {withCoords.map((lead) => {
            const [lng, lat] = lead.location.coordinates;
            return (
              <Marker key={lead._id} position={[lat, lng]}>
                <Popup>
                  <strong>{lead.businessName}</strong>
                  <br />
                  {lead.category}
                  <br />
                  {lead.phone || 'No phone on file'}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
