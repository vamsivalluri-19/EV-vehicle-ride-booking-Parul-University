import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Phone, UserCheck, Map as MapIcon } from 'lucide-react';
import { CATEGORIZED_LOCATIONS } from '../utils/locations';

const API_BASE = import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:5000`;
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issues in React
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
  return [start, end]; // fallback
};

export default function UserDashboard() {
  const [requestState, setRequestState] = useState('IDLE'); // IDLE, PENDING, ACCEPTED
  const [rideData, setRideData] = useState(null);
  
  const [pickup, setPickup] = useState('Parul Institute of Engineering & Technology');
  const [dropoff, setDropoff] = useState('Student Section');
  
  // GPS State
  const [gpsSource, setGpsSource] = useState('simulated'); // 'device' or 'simulated'
  const [userCoords, setUserCoords] = useState([22.2897, 73.3641]); // Parul Campus Center
  const [vehicles, setVehicles] = useState([]); // Live vehicles list
  
  // Reference map modal state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Road directions route states
  const [driverToUserPath, setDriverToUserPath] = useState([]);
  const [userToDropoffPath, setUserToDropoffPath] = useState([]);
  
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  // 1. Fetch Ride Status and Live Vehicles
  useEffect(() => {
    if (!user || user.role !== 'user') navigate('/login');
    
    // Status Poller
    const interval = setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/user/ride-status/` + user.id);
            const data = await res.json();
            if (data.success && data.request) {
                setRideData(data);
                setRequestState(data.request.status.toUpperCase());
            } else {
                setRequestState('IDLE');
                setRideData(null);
            }
        } catch(e) {}
    }, 2000);

    // Live Vehicles Poller (only when idle/pending)
    const vehInterval = setInterval(async () => {
        if (requestState !== 'ACCEPTED') {
            try {
                const res = await fetch(`${API_BASE}/api/vehicles/live`);
                const data = await res.json();
                setVehicles(data);
            } catch(e) {}
        }
    }, 2000);

    return () => {
        clearInterval(interval);
        clearInterval(vehInterval);
    };
  }, [navigate, requestState]);

  // 2. Fetch OSRM directions along roads when ride accepted
  useEffect(() => {
    if (requestState === 'ACCEPTED' && rideData && rideData.request) {
      const driver = [rideData.request.driverLat, rideData.request.driverLng];
      const userL = [rideData.request.userLat || userCoords[0], rideData.request.userLng || userCoords[1]];
      const drop = rideData.request.dropoffCoords;

      fetchOSRMRoute(driver, userL).then(path => setDriverToUserPath(path));
      fetchOSRMRoute(userL, drop).then(path => setUserToDropoffPath(path));
    } else {
      setDriverToUserPath([]);
      setUserToDropoffPath([]);
    }
  }, [
    requestState,
    rideData?.request?.driverLat,
    rideData?.request?.driverLng,
    rideData?.request?.userLat,
    rideData?.request?.userLng,
    userCoords[0],
    userCoords[1]
  ]);

  // 3. Geolocation Watcher
  useEffect(() => {
    if (gpsSource !== 'device') return;
    
    const sendLocationUpdate = async (lat, lng) => {
      try {
         await fetch(`${API_BASE}/api/user/update-location`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ userId: user.id, lat, lng })
         });
      } catch (e) {
         console.warn("Failed updating live location on server:", e);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords([lat, lng]);
        sendLocationUpdate(lat, lng);
      },
      (err) => {
        console.warn("GPS Geolocation Error:", err);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [gpsSource, user?.id]);

  const handleRequestRide = async (e) => {
    e.preventDefault();
    if (!pickup || !dropoff) return;
    setRequestState('PENDING');
    
    // Create ride request
    const res = await fetch(`${API_BASE}/api/user/request-ride`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, pickupLocation: pickup, dropoffLocation: dropoff })
    });
    const data = await res.json();
    if (data.success) {
      setRideData({ request: data.request });
      // Send current location immediately to set initial position
      fetch(`${API_BASE}/api/user/update-location`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ userId: user.id, lat: userCoords[0], lng: userCoords[1] })
      }).catch(e => {});
    }
  };

  const handleMapClick = (latlng) => {
    if (gpsSource === 'simulated') {
      const lat = latlng.lat;
      const lng = latlng.lng;
      setUserCoords([lat, lng]);
      
      // Update location on server
      if (user && user.id) {
         fetch(`${API_BASE}/api/user/update-location`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ userId: user.id, lat, lng })
         }).catch(e => {});
      }
    }
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  return (
    <div className="app-container" style={{ maxWidth: '1400px' }}>
      <header>
        <h1>User Dashboard</h1>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button className="btn secondary" style={{ width: 'auto' }} onClick={() => setIsMapModalOpen(true)}>
            <MapIcon size={16}/> Reference Map
          </button>
          <button className="btn outline" style={{ width: 'auto' }} onClick={logout}>
            <LogOut size={16}/> Logout
          </button>
        </div>
      </header>
      
      {/* GPS SOURCE CONTROLS */}
      <div className="gps-controls-container">
        <div className="gps-control-group">
          <div className={`gps-indicator ${gpsSource === 'device' ? 'active' : ''}`}>
            <div className="indicator-dot"></div>
            <span>
              {gpsSource === 'device' ? 'GPS Active (Device Geolocation)' : 'Simulating GPS Location'}
            </span>
          </div>
          <div className="gps-btn-toggle">
            <button 
              type="button" 
              className={gpsSource === 'simulated' ? 'active' : ''} 
              onClick={() => setGpsSource('simulated')}
            >
              Simulate (Click Map)
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
        {gpsSource === 'simulated' && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            💡 <strong>Map Click Mode:</strong> Click anywhere on the map to set your live passenger location.
          </p>
        )}
      </div>

      <main style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* LEFT COLUMN: CONTROLS & RIDE STATE */}
        <div style={{ flex: '1', minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {requestState === 'IDLE' && (
            <div className="card glass-card">
              <h2 style={{ marginBottom: '1.5rem' }}>Request a Ride</h2>
              <form onSubmit={handleRequestRide} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                  <div>
                      <label style={{color:'var(--text-secondary)'}}>Where are you?</label>
                      <select className="form-input" value={pickup} onChange={e=>setPickup(e.target.value)}>
                      {Object.entries(CATEGORIZED_LOCATIONS).map(([category, locs]) => (
                          <optgroup key={category} label={category}>
                          {locs.map(l => <option key={l.code + '-pick'} value={l.name}>{l.name}</option>)}
                          </optgroup>
                      ))}
                      </select>
                  </div>
                  <div>
                      <label style={{color:'var(--text-secondary)'}}>Where to?</label>
                      <select className="form-input" value={dropoff} onChange={e=>setDropoff(e.target.value)}>
                      {Object.entries(CATEGORIZED_LOCATIONS).map(([category, locs]) => (
                          <optgroup key={category} label={category}>
                          {locs.map(l => <option key={l.code + '-drop'} value={l.name}>{l.name}</option>)}
                          </optgroup>
                      ))}
                      </select>
                  </div>
                  <button type="submit" className="btn" style={{padding: '1rem', fontSize: '1.2rem'}}>Broadcast Request</button>
              </form>
            </div>
          )}

          {requestState === 'PENDING' && (
            <div className="card glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
               <div className="pulse-dot" style={{ width: '40px', height: '40px', marginBottom: '2rem' }}></div>
               <h2>Searching for nearby drivers...</h2>
               <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
                 Your request from <strong>{pickup}</strong> to <strong>{dropoff}</strong> is live. Waiting for an EV driver to accept.
               </p>
            </div>
          )}

          {requestState === 'ACCEPTED' && rideData && rideData.request && (
            <div className="card glass-card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
              <h2 style={{ color: 'var(--accent-color)', marginBottom: '1.5rem' }}>Ride Accepted!</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)' }}>DRIVER DETAILS</h4>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '0.2rem' }}>
                    {rideData.driverInfo?.name}
                  </p>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    <Phone size={14}/> {rideData.driverInfo?.mobile}
                  </p>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                <div>
                  <h4 style={{ color: 'var(--text-secondary)' }}>VEHICLE DETAILS</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ padding: '0.4rem 0.8rem', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '20px', color: '#60a5fa', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      {rideData.driverInfo?.vehicleName}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Type: {rideData.driverInfo?.vehicleType || 'Shuttle'}
                    </span>
                  </div>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Pickup: <strong>{rideData.request.pickupLocation}</strong>
                  </p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    Dropoff: <strong>{rideData.request.dropoffLocation}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* QUICK campus stats */}
          <div className="card glass-card">
            <h3>Campus Transit Stats</h3>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Active Shuttles:</span>
                <span style={{ fontWeight: 'bold' }}>{vehicles.length || 30}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Transit Center:</span>
                <span style={{ fontWeight: 'bold' }}>Parul Campus</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE TRACKING MAP */}
        <div style={{ flex: '1.8', minWidth: '350px', display: 'flex', flexDirection: 'column' }}>
          <div className="card" style={{ padding: '0', overflow: 'hidden', height: '100%', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.2rem 1.5rem', background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapIcon size={20} style={{ color: 'var(--primary-color)' }} />
                {requestState === 'ACCEPTED' ? 'Live Ride Directions Map' : 'Campus EV Shuttles Map'}
              </h3>
              {requestState === 'ACCEPTED' && (
                <span className="gps-indicator active" style={{ fontSize: '0.8rem' }}>
                  <div className="indicator-dot"></div> Connected to Driver
                </span>
              )}
            </div>
            
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
              <MapContainer center={[22.2897, 73.3641]} zoom={16} style={{ height: '100%', width: '100%', minHeight: '450px' }}>
                <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" attribution="&copy; Google Maps" />
                
                <MapClickHandler onMapClick={handleMapClick} enabled={gpsSource === 'simulated'} />

                {/* Always draw Passenger Live Location marker */}
                <Marker position={[userCoords[0], userCoords[1]]} icon={userLiveIcon}>
                  <Popup>
                    <div>
                      <strong>Your Live Location</strong>
                      <p style={{margin:0, fontSize:'0.8rem', color:'gray'}}>
                        {gpsSource === 'simulated' ? '(Simulated - Click to move)' : '(Real Device GPS)'}
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {/* CASE A: ACTIVE RIDE */}
                {requestState === 'ACCEPTED' && rideData && rideData.request && (
                  <>
                    {/* Pickup Static Marker */}
                    <Marker position={rideData.request.pickupCoords}>
                      <Popup>Pickup Point: {rideData.request.pickupLocation}</Popup>
                    </Marker>
                    
                    {/* Dropoff Static Marker */}
                    <Marker position={rideData.request.dropoffCoords}>
                      <Popup>Dropoff Point: {rideData.request.dropoffLocation}</Popup>
                    </Marker>
                    
                    {/* Driver/Vehicle Marker */}
                    <Marker 
                      position={[rideData.request.driverLat, rideData.request.driverLng]} 
                      icon={rideData.driverInfo?.vehicleType === 'Bus' ? busIcon : driverIcon}
                    >
                      <Popup>
                        <strong>{rideData.driverInfo?.name || 'Driver'}</strong> is arriving in {rideData.driverInfo?.vehicleName}!
                      </Popup>
                    </Marker>
                    
                    {/* Road Path 1: Driver to Passenger Live Coords */}
                    <Polyline 
                      positions={driverToUserPath.length > 0 ? driverToUserPath : [[rideData.request.driverLat, rideData.request.driverLng], [userCoords[0], userCoords[1]]]} 
                      color="#10b981" 
                      weight={5} 
                      dashArray="5, 10" 
                      opacity={0.8} 
                    />

                    {/* Road Path 2: Passenger Live Coords to Dropoff */}
                    <Polyline 
                      positions={userToDropoffPath.length > 0 ? userToDropoffPath : [[userCoords[0], userCoords[1]], rideData.request.dropoffCoords]} 
                      color="#3b82f6" 
                      weight={5} 
                      opacity={0.7} 
                    />
                  </>
                )}

                {/* CASE B: IDLE / PENDING (Show nearby vehicles) */}
                {requestState !== 'ACCEPTED' && vehicles.map(v => (
                  <Marker 
                    key={v.id} 
                    position={[v.lat, v.lng]} 
                    icon={v.type === 'Bus' ? busIcon : driverIcon}
                  >
                    <Popup>
                      <strong>{v.name}</strong><br/>
                      Driver: {v.driverName}<br/>
                      Status: <span style={{ color: v.status === 'Active' ? 'green' : 'orange' }}>{v.status}</span>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
      </main>

      {/* Official Campus map reference Modal */}
      <CampusMapModal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} />
    </div>
  );
}
