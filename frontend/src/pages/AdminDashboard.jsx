import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, UserCheck } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:5000`;

export default function AdminDashboard() {
  const [data, setData] = useState({ vehicles: [], drivers: [] });
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  
  const [assigningVehicleId, setAssigningVehicleId] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const fetchData = async () => {
    const res = await fetch(`${API_BASE}/api/admin/data`);
    const json = await res.json();
    setData(json);
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/login');
    fetchData();
  }, [navigate]);

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!newVehicleName) return;
    await fetch(`${API_BASE}/api/admin/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newVehicleName, type: 'Bus', capacity: 30 })
    });
    setNewVehicleName('');
    setShowAddForm(false);
    fetchData();
  };

  const handleAssignDriver = async (e) => {
    e.preventDefault();
    if (!selectedDriverId) return;
    const res = await fetch(`${API_BASE}/api/admin/assign-driver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId: parseInt(assigningVehicleId), driverId: parseInt(selectedDriverId) })
    });
    const result = await res.json();
    if (result.success) {
      setAssigningVehicleId(null);
      setSelectedDriverId('');
      fetchData();
    } else alert(result.message);
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const getVehicleImage = (id) => {
    return id % 2 === 0 ? '/ev_shuttle.png' : '/ev_bus.png';
  }

  return (
    <div className="app-container">
      <header>
        <h1>Admin Dashboard</h1>
        <button className="btn outline" style={{ width: 'auto' }} onClick={logout}><LogOut size={16}/> Logout</button>
      </header>
      <main>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
          <h2>Manage Vehicles</h2>
          {!showAddForm && <button className="btn" style={{ width: 'auto' }} onClick={() => setShowAddForm(true)}><Plus size={16}/> Add Vehicle</button>}
        </div>
        
        {showAddForm && (
          <div className="card glass-card" style={{ marginBottom: '2rem' }}>
            <h3>Add New Vehicle</h3>
            <form onSubmit={handleAddVehicle} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <input type="text" className="form-input" placeholder="Vehicle Name (e.g. EV Bus 03)" value={newVehicleName} onChange={e => setNewVehicleName(e.target.value)} required />
              <button type="submit" className="btn" style={{ width: 'auto' }}>Save</button>
              <button type="button" className="btn secondary" style={{ width: 'auto' }} onClick={() => setShowAddForm(false)}>Cancel</button>
            </form>
          </div>
        )}

        <div className="dashboard-grid">
          {data.vehicles.map(v => (
            <div key={v.id} className="card image-card">
              <div className="card-image" style={{ backgroundImage: 'url(' + getVehicleImage(v.id) + ')' }}>
                 <div className="overlay"></div>
              </div>
              <div className="card-content">
                <h3>{v.name}</h3>
                <p style={{color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>Type: {v.type}</p>
                <p>Driver: {v.driverId ? 'ID ' + v.driverId : <span style={{color:'var(--accent-danger)'}}>Unassigned</span>}</p>
                
                {!v.driverId && assigningVehicleId !== v.id && (
                  <button className="btn secondary" style={{marginTop:'1rem'}} onClick={() => setAssigningVehicleId(v.id)}>
                    <UserCheck size={16}/> Assign Driver
                  </button>
                )}

                {assigningVehicleId === v.id && (
                  <form onSubmit={handleAssignDriver} style={{marginTop: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px'}}>
                    <select className="form-input" value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)} required>
                      <option value="">Select a driver...</option>
                      {data.drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name} (ID: {d.id})</option>
                      ))}
                    </select>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <button type="submit" className="btn" style={{padding: '0.5rem'}}>Confirm</button>
                      <button type="button" className="btn outline" style={{padding: '0.5rem'}} onClick={() => setAssigningVehicleId(null)}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
