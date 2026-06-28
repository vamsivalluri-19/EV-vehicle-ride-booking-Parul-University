import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, CheckCircle, Navigation, Map as MapIcon } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:5000`;
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const driverIcon = new L.Icon({
    iconUrl: '/ev_shuttle.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    className: 'driver-marker'
});

const busIcon = new L.Icon({
    iconUrl: '/ev_bus.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    className: 'driver-marker'
});

const userLiveIcon = L.divIcon({
    className: 'user-live-marker',
    html: '<div class="user-ping"></div><div class="user-dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// Map Event Handler for clicks
function MapClickHandler({ onMapClick, enabled }) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

// Zoomable official campus map modal reference component
function CampusMapModal({ isOpen, onClose }) {
  const [zoom, setZoom] = useState(1);
  if (!isOpen) return null;
  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal-content" onClick={e => e.stopPropagation()}>
        <div className="map-modal-header">
          <h3>Official Parul Campus Reference Map</h3>
          <button className="map-modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="map-modal-body">
          <div className="map-image-wrapper">
            <img 
              src="https://paruluniversity.ac.in/wp-content/uploads/2025/12/A3-PU-Campus-Map-2023-R1-c2c_latest_page-0001.jpg" 
              alt="Parul Campus Map" 
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.25s', maxWidth: '100%', height: 'auto' }}
            />
          </div>
          <div className="map-modal-zoom-controls">
            <button className="zoom-btn" onClick={() => setZoom(z => Math.min(z + 0.25, 3.5))}>+</button>
            <button className="zoom-btn" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}>-</button>
            <button className="zoom-btn" style={{ fontSize: '0.8rem' }} onClick={() => setZoom(1)}>Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// OSRM directions api query helper
const fetchOSRMRoute = async (start, end) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
    }
  } catch (e) {
    console.error("OSRM routing failed:", e);
  }
  return [start, end];
};

export default function DriverDashboard() {
  const [requests, setRequests] = useState([]);
  const [assignedVehicle, setAssignedVehicle] = useState(null);
  const [activeBookings, setActiveBookings] = useState([]);
  
  // GPS State
  const [gpsSource, setGpsSource] = useState('simulated'); // 'device' or 'simulated'
  const [driveMode, setDriveMode] = useState('auto'); // 'auto' or 'manual' (map click)
  const [driverCoords, setDriverCoords] = useState([22.2897, 73.3641]); // Parul Campus Center
  
  // Campus reference map modal state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Road directions route states
  const [driverToUserPath, setDriverToUserPath] = useState([]);
  const [userToDropoffPath, setUserToDropoffPath] = useState([]);

  // Auto-drive road network sequence state
  const [simPath, setSimPath] = useState([]);
  const [simIndex, setSimIndex] = useState(0);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const fetchData = async () => {
    try {
        const res1 = await fetch(`${API_BASE}/api/driver/requests`);
        setRequests(await res1.json());

        const res2 = await fetch(`${API_BASE}/api/driver/assignments/` + user.id);
        const data = await res2.json();
        setAssignedVehicle(data.assignedVehicle);
        setActiveBookings(data.activeBookings);
        
        // Initialize coords to vehicle's preset location if we don't have them
        if (data.assignedVehicle && driverCoords[0] === 22.2897 && driverCoords[1] === 73.3641) {
            if (data.assignedVehicle.lat && data.assignedVehicle.lng) {
                setDriverCoords([data.assignedVehicle.lat, data.assignedVehicle.lng]);
            }
        }
    } catch(e){}
  };

  useEffect(() => {
    if (!user || user.role !== 'driver') navigate('/login');
    fetchData();
    const int = setInterval(fetchData, 2000); 
    return () => clearInterval(int);
  }, [navigate]);

  // Fetch static route line directions when active booking changes
  useEffect(() => {
    if (activeBookings.length > 0) {
      const b = activeBookings[0];
      const start = [driverCoords[0], driverCoords[1]];
      const passenger = [b.userLat || b.pickupCoords[0], b.userLng || b.pickupCoords[1]];
      const drop = b.dropoffCoords;

      fetchOSRMRoute(start, passenger).then(path => setDriverToUserPath(path));
      fetchOSRMRoute(passenger, drop).then(path => setUserToDropoffPath(path));
    } else {
      setDriverToUserPath([]);
      setUserToDropoffPath([]);
    }
  }, [activeBookings.length, driverCoords[0], driverCoords[1], activeBookings[0]?.userLat, activeBookings[0]?.userLng]);

  // Fetch full OSRM path sequence for Auto-Drive when booking begins
  useEffect(() => {
    if (activeBookings.length > 0 && gpsSource === 'simulated' && driveMode === 'auto') {
      const b = activeBookings[0];
      const start = [driverCoords[0], driverCoords[1]];
      const mid = [b.userLat || b.pickupCoords[0], b.userLng || b.pickupCoords[1]];
      const end = b.dropoffCoords;

      const loadPath = async () => {
         const p1 = await fetchOSRMRoute(start, mid);
         const p2 = await fetchOSRMRoute(mid, end);
         const fullPath = [...p1, ...p2];
         setSimPath(fullPath);
         setSimIndex(0);
      };
      loadPath();
    } else {
      setSimPath([]);
      setSimIndex(0);
    }
  }, [activeBookings.length, gpsSource, driveMode]);

  // GPS Reporting & Auto-Drive movement Simulation
  useEffect(() => {
    if (!user) return;
    
    const sendLocationUpdate = async (lat, lng) => {
      try {
        await fetch(`${API_BASE}/api/driver/update-location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId: user.id, lat, lng })
        });
      } catch(e) {}
    };

    // Watch actual device GPS
    let watchId;
    if (gpsSource === 'device') {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setDriverCoords([lat, lng]);
          sendLocationUpdate(lat, lng);
        },
        (err) => console.warn(err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    // Client-side auto-drive simulator along road paths
    let autoInterval;
    if (gpsSource === 'simulated' && driveMode === 'auto' && simPath.length > 0) {
      autoInterval = setInterval(() => {
        if (simIndex >= simPath.length) {
          clearInterval(autoInterval);
          return;
        }

        const targetCoords = simPath[simIndex];
        setDriverCoords(prev => {
          const dLat = targetCoords[0] - prev[0];
          const dLng = targetCoords[1] - prev[1];
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);

          if (dist < 0.0001) {
            // Arrived at current target node, move to next node on next tick
            setSimIndex(idx => Math.min(idx + 1, simPath.length - 1));
            return targetCoords;
          }

          // Move 25% closer to current target node for smooth transition
          const nextLat = prev[0] + dLat * 0.25;
          const nextLng = prev[1] + dLng * 0.25;
          sendLocationUpdate(nextLat, nextLng);
          return [nextLat, nextLng];
        });
      }, 1000);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (autoInterval) clearInterval(autoInterval);
    };
  }, [gpsSource, driveMode, simPath, simIndex, user?.id]);

  const handleAccept = async (reqId) => {
    const res = await fetch(`${API_BASE}/api/driver/accept-ride`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: user.id, requestId: reqId })
    });
    const data = await res.json();
    if(data.success) {
        fetchData();
    } else {
        alert("Failed to accept ride. Maybe someone else accepted it.");
    }
  };

  const handleMapClick = (latlng) => {
    if (gpsSource === 'simulated' && driveMode === 'manual') {
      const lat = latlng.lat;
      const lng = latlng.lng;
      setDriverCoords([lat, lng]);
      
      if (user && user.id) {
        fetch(`${API_BASE}/api/driver/update-location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId: user.id, lat, lng })
        }).catch(e => {});
      }
    }
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  return (
    <div className="app-container" style={{ maxWidth: '1400px' }}>
      <header>
        <h1>Driver Dashboard</h1>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button className="btn secondary" style={{ width: 'auto' }} onClick={() => setIsMapModalOpen(true)}>
            <MapIcon size={16}/> Reference Map
          </button>
          <button className="btn outline" style={{ width: 'auto' }} onClick={logout}>
            <LogOut size={16}/> Logout
          </button>
        </div>
      </header>
      
      {/* GPS CONTROLS */}
      <div className="gps-controls-container">
        <div className="gps-control-group">
          <div className={`gps-indicator ${gpsSource === 'device' ? 'active' : ''}`}>
            <div className="indicator-dot"></div>
            <span>
              {gpsSource === 'device' 
                ? 'Tracking Vehicle GPS (Device)' 
                : `Simulating GPS (${driveMode === 'auto' ? 'Auto-Driving' : 'Map Clicks'})`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {gpsSource === 'simulated' && (
              <div className="gps-btn-toggle" style={{ marginRight: '0.5rem' }}>
                <button 
                  type="button" 
                  className={driveMode === 'auto' ? 'active' : ''} 
                  onClick={() => setDriveMode('auto')}
                >
                  Auto-Drive
                </button>
                <button 
                  type="button" 
                  className={driveMode === 'manual' ? 'active' : ''} 
                  onClick={() => setDriveMode('manual')}
                >
                  Map Click
                </button>
              </div>
            )}
            <div className="gps-btn-toggle">
              <button 
                type="button" 
                className={gpsSource === 'simulated' ? 'active' : ''} 
                onClick={() => setGpsSource('simulated')}
              >
                Mock GPS
              </button>
              <button 
                type="button" 
                className={gpsSource === 'device' ? 'active' : ''} 
                onClick={() => setGpsSource('device')}
              >
                Device GPS
              </button>
            </div>
          </div>
        </div>
        {gpsSource === 'simulated' && driveMode === 'manual' && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            💡 <strong>Manual Mode:</strong> Click anywhere on the map to set/update your vehicle's live GPS location.
          </p>
        )}
        {gpsSource === 'simulated' && driveMode === 'auto' && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            🚗 <strong>Auto-Drive Mode:</strong> The vehicle will automatically move along the road network to the passenger.
          </p>
        )}
      </div>

      <main style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* LEFT COLUMN: VEHICLE ASSIGNMENT & RIDES */}
        <div style={{ flex: '1', minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card highlight">
            <h2>Vehicle Assignment</h2>
            {assignedVehicle ? (
              <div style={{ marginTop: '0.5rem' }}>
                <p>You are driving: <strong>{assignedVehicle.name}</strong></p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Capacity: {assignedVehicle.capacity} seats | Type: {assignedVehicle.type}
                </p>
              </div>
            ) : (
              <p style={{ color: 'var(--accent-danger)' }}>No vehicle assigned to you yet.</p>
            )}
          </div>

          {activeBookings.length > 0 ? (
            <div className="card glass-card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
              <h2 style={{ color: 'var(--accent-color)', marginBottom: '1.2rem' }}>Active Ride in Progress</h2>
              {activeBookings.map(b => (
                <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <h4 style={{ color: 'var(--text-secondary)' }}>PASSENGER</h4>
                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{b.userName}</p>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                  <div>
                    <p><strong><Navigation size={14} style={{verticalAlign:'middle', marginRight:'0.2rem'}}/> Pickup:</strong> {b.pickupLocation}</p>
                    <p style={{marginTop:'0.5rem'}}><strong><CheckCircle size={14} style={{verticalAlign:'middle', marginRight:'0.2rem'}}/> Dropoff:</strong> {b.dropoffLocation}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card glass-card">
              <h2 style={{ marginBottom: '1rem' }}>Open Ride Requests</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {requests.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No passenger requests at the moment.</p> : 
                  requests.map(r => (
                    <div key={r.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h3>{r.userName}</h3>
                      <p style={{marginTop:'0.3rem', fontSize:'0.9rem', color: 'var(--text-secondary)'}}>Pickup: {r.pickupLocation}</p>
                      <p style={{fontSize:'0.9rem', color: 'var(--text-secondary)'}}>Dropoff: {r.dropoffLocation}</p>
                      
                      <button className="btn" style={{marginTop:'0.8rem', padding:'0.5rem'}} onClick={() => handleAccept(r.id)}>
                        Accept Ride
                      </button>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE NAVIGATION MAP */}
        <div style={{ flex: '1.8', minWidth: '350px', display: 'flex', flexDirection: 'column' }}>
          {activeBookings.length > 0 ? (
            activeBookings.map(b => (
              <div className="card" key={`map-${b.id}`} style={{ padding: '0', overflow: 'hidden', height: '100%', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.2rem 1.5rem', background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapIcon size={20} style={{ color: 'var(--primary-color)' }} />
                    Live Directions Navigation Map
                  </h3>
                  <span className="gps-indicator active" style={{ fontSize: '0.8rem' }}>
                    <div className="indicator-dot"></div> Live GPS Tracking
                  </span>
                </div>
                
                <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
                  <MapContainer center={[22.2897, 73.3641]} zoom={16} style={{ height: '100%', width: '100%', minHeight: '450px' }}>
                    <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" />
                    
                    <MapClickHandler onMapClick={handleMapClick} enabled={gpsSource === 'simulated' && driveMode === 'manual'} />
                    
                    {/* Pickup Static Marker */}
                    <Marker position={b.pickupCoords}>
                      <Popup>Passenger Pickup: {b.pickupLocation}</Popup>
                    </Marker>
                    
                    {/* Dropoff Static Marker */}
                    <Marker position={b.dropoffCoords}>
                      <Popup>Passenger Dropoff: {b.dropoffLocation}</Popup>
                    </Marker>
                    
                    {/* Passenger's Live Coords Marker */}
                    <Marker position={[b.userLat || b.pickupCoords[0], b.userLng || b.pickupCoords[1]]} icon={userLiveIcon}>
                      <Popup>Passenger's Live Location</Popup>
                    </Marker>

                    {/* Driver's Live Coords Marker */}
                    <Marker 
                      position={[driverCoords[0], driverCoords[1]]} 
                      icon={assignedVehicle?.type === 'Bus' ? busIcon : driverIcon}
                    >
                      <Popup>You (Vehicle Location)</Popup>
                    </Marker>
                    
                    {/* Road Path 1: Driver to Passenger Live Coords */}
                    <Polyline 
                      positions={driverToUserPath.length > 0 ? driverToUserPath : [[driverCoords[0], driverCoords[1]], [b.userLat || b.pickupCoords[0], b.userLng || b.pickupCoords[1]]]} 
                      color="#10b981" 
                      weight={5} 
                      dashArray="5, 10" 
                      opacity={0.8} 
                    />

                    {/* Road Path 2: Passenger Live Coords to Dropoff */}
                    <Polyline 
                      positions={userToDropoffPath.length > 0 ? userToDropoffPath : [[b.userLat || b.pickupCoords[0], b.userLng || b.pickupCoords[1]], b.dropoffCoords]} 
                      color="#3b82f6" 
                      weight={5} 
                      opacity={0.7} 
                    />
                  </MapContainer>
                </div>
              </div>
            ))
          ) : (
            <div className="card" style={{ padding: '0', overflow: 'hidden', height: '100%', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.2rem 1.5rem', background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h3 style={{ margin: 0 }}>Campus Map</h3>
              </div>
              <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
                <MapContainer center={[22.2897, 73.3641]} zoom={16} style={{ height: '100%', width: '100%', minHeight: '450px' }}>
                  <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" />
                  <MapClickHandler onMapClick={handleMapClick} enabled={gpsSource === 'simulated' && driveMode === 'manual'} />
                  
                  {/* Show driver's own shuttle location even when not on an active ride */}
                  <Marker 
                    position={[driverCoords[0], driverCoords[1]]} 
                    icon={assignedVehicle?.type === 'Bus' ? busIcon : driverIcon}
                  >
                    <Popup>Your Vehicle Location</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Official Campus map reference Modal */}
      <CampusMapModal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} />
    </div>
  );
}
