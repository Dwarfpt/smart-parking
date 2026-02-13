// Список парковок — карта Leaflet, поиск, карточки
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { parkingAPI } from '../services/api';
import { MapPin } from 'lucide-react';
import L from 'leaflet';

// Fix default marker icon for Leaflet + Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function ParkingsPage() {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parkingAPI.getAll()
      .then((res) => setLots(res.data.parkingLots || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <h2 style={{ marginBottom: 20 }}>
        <MapPin size={24} style={{ verticalAlign: 'middle' }} /> Парковки Кишинёва
      </h2>

      <div className="map-container" style={{ marginBottom: 24 }}>
        <MapContainer
          center={[47.0245, 28.8297]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {lots.map((lot) => (
            <Marker
              key={lot._id}
              position={[
                lot.location?.coordinates?.[1] || 47.02,
                lot.location?.coordinates?.[0] || 28.83,
              ]}
            >
              <Popup>
                <strong>{lot.name}</strong>
                <br />
                {lot.address}
                <br />
                Свободно: <strong>{lot.freeSpots}</strong> / {lot.totalSpots}
                <br />
                {lot.tariff && <>Цена: {lot.tariff.pricePerHour} MDL/ч<br /></>}
                <Link to={`/parking/${lot._id}`}>Подробнее →</Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {lots.map((lot) => (
          <div key={lot._id} className="card">
            <h3>{lot.name}</h3>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', margin: '6px 0' }}>
              {lot.address}
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <span className="badge badge-green">{lot.freeSpots} свободно</span>
              <span className="badge badge-red">{lot.occupiedSpots || 0} занято</span>
              <span className="badge badge-yellow">{lot.reservedSpots || 0} забронировано</span>
            </div>
            {lot.tariff && (
              <p style={{ fontSize: '0.9rem', marginBottom: 8 }}>
                💰 {lot.tariff.pricePerHour} MDL/ч • Абонемент от {lot.tariff.subscriptionWeek} MDL/нед
              </p>
            )}
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 12 }}>
              🕐 {lot.workingHours?.open} – {lot.workingHours?.close}
            </p>
            <Link to={`/parking/${lot._id}`} className="btn btn-primary btn-sm">
              Выбрать место
            </Link>
          </div>
        ))}
        {lots.length === 0 && (
          <p style={{ color: 'var(--gray-500)' }}>Парковок пока нет.</p>
        )}
      </div>
    </div>
  );
}
