const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-Memory Database
const RAW_STOPS = [
  { id: 'EVS01', name: 'Main Entry Gate', loc: 'Entry Gate', cat: 'Gateway', driver: 'Rajesh Kumar', phone: '9876500001' },
  { id: 'EVS02', name: 'Central Academic Hub', loc: 'A1 A2 A3 A4 A5', cat: 'Academic', driver: 'Suresh Patel', phone: '9876500002' },
  { id: 'EVS03', name: 'Hospital Junction', loc: 'E1 E2 E3 E4 E5', cat: 'Hospital', driver: 'Amit Sharma', phone: '9876500003' },
  { id: 'EVS04', name: 'Management Block', loc: 'A14 A15', cat: 'Academic', driver: 'Vikram Singh', phone: '9876500004' },
  { id: 'EVS05', name: 'Architecture Block', loc: 'A16', cat: 'Academic', driver: 'Ravi Kumar', phone: '9876500005' },
  { id: 'EVS06', name: 'Homoeopathy Block', loc: 'A17', cat: 'Academic', driver: 'Manoj Gupta', phone: '9876500006' },
  { id: 'EVS07', name: 'Technology Block', loc: 'A19 A20 A21', cat: 'Academic', driver: 'Kiran Reddy', phone: '9876500007' },
  { id: 'EVS08', name: 'Design & Arts Hub', loc: 'A22 A23', cat: 'Academic', driver: 'Praveen Yadav', phone: '9876500008' },
  { id: 'EVS09', name: 'CV Raman Centre', loc: 'A25', cat: 'Academic', driver: 'Santosh Rao', phone: '9876500009' },
  { id: 'EVS10', name: 'Hostel Cluster North', loc: 'H25 H26 H32 H34', cat: 'Hostel', driver: 'Rahul Verma', phone: '9876500010' },
  { id: 'EVS11', name: 'Hostel Cluster Central', loc: 'H1 H2 H3 H4', cat: 'Hostel', driver: 'Ajay Kumar', phone: '9876500011' },
  { id: 'EVS12', name: 'Hostel Cluster East', loc: 'H15 H16 H17 H18', cat: 'Hostel', driver: 'Naveen Raju', phone: '9876500012' },
  { id: 'EVS13', name: 'Hostel Cluster South', loc: 'H19 H20 H21 H22', cat: 'Hostel', driver: 'Arjun Patel', phone: '9876500013' },
  { id: 'EVS14', name: 'Azad Bhawan', loc: 'H33', cat: 'Hostel', driver: 'Mahesh Naidu', phone: '9876500014' },
  { id: 'EVS15', name: 'Watchers Park', loc: 'G1', cat: 'Sports', driver: 'Harish Kumar', phone: '9876500015' },
  { id: 'EVS16', name: 'Football Ground', loc: 'G3', cat: 'Sports', driver: 'Deepak Singh', phone: '9876500016' },
  { id: 'EVS17', name: 'Cricket Ground', loc: 'G5', cat: 'Sports', driver: 'Ramesh Babu', phone: '9876500017' },
  { id: 'EVS18', name: 'Multipurpose Ground', loc: 'G7', cat: 'Sports', driver: 'Sai Teja', phone: '9876500018' },
  { id: 'EVS19', name: 'Court Complex', loc: 'G9 G10', cat: 'Sports', driver: 'Venkat Rao', phone: '9876500019' },
  { id: 'EVS20', name: 'Bus Parking', loc: 'P4', cat: 'Transport', driver: 'Rohit Sharma', phone: '9876500020' },
  { id: 'EVS21', name: 'Student Parking', loc: 'P3', cat: 'Parking', driver: 'Karthik Reddy', phone: '9876500021' },
  { id: 'EVS22', name: 'Visitor Parking', loc: 'P1', cat: 'Parking', driver: 'Anil Kumar', phone: '9876500022' },
  { id: 'EVS23', name: 'Staff Parking North', loc: 'P5 P6', cat: 'Parking', driver: 'Srinivas Rao', phone: '9876500023' },
  { id: 'EVS24', name: 'Food Court Central', loc: 'F1 F2 F3', cat: 'Food Court', driver: 'Naresh Patel', phone: '9876500024' },
  { id: 'EVS25', name: 'Food Court East', loc: 'F7 F8', cat: 'Food Court', driver: 'Gopal Krishna', phone: '9876500025' },
  { id: 'EVS26', name: 'Administrative Block', loc: 'C1 C2 C3 C4 C5', cat: 'Administration', driver: 'Murali Mohan', phone: '9876500026' },
  { id: 'EVS27', name: 'Bank & Services', loc: 'B1 TS', cat: 'Bank/Transport', driver: 'Sunil Verma', phone: '9876500027' },
  { id: 'EVS28', name: 'Swimming Pool', loc: 'S1', cat: 'Recreation', driver: 'Krishna Reddy', phone: '9876500028' },
  { id: 'EVS29', name: 'Temple', loc: 'T', cat: 'Utility', driver: 'Dinesh Kumar', phone: '9876500029' },
  { id: 'EVS30', name: 'Exit Gate', loc: 'Exit Gate', cat: 'Gateway', driver: 'Balaji Rao', phone: '9876500030' }
];

// Exact Parul University Campus building coordinates mapping
const CAMPUS_COORDS = {
    "Main Entry Gate": [22.2881, 73.3638],
    "Central Academic Hub": [22.2897, 73.3641],
    "Parul Institute of Engineering": [22.2897, 73.3641],
    "Hospital Junction": [22.2902, 73.3621],
    "Parul Sevashram Hospital": [22.2902, 73.3621],
    "Sevashram": [22.2902, 73.3621],
    "Administrative Block": [22.2889, 73.3636],
    "Student Section": [22.2889, 73.3636],
    "Admission Cell": [22.2889, 73.3636],
    "Food Court Central": [22.2899, 73.3647],
    "Food Court East": [22.2902, 73.3658],
    "Football Ground": [22.2912, 73.3653],
    "Cricket Ground": [22.2917, 73.3642],
    "Technology Block": [22.2891, 73.3650],
    "Architecture Block": [22.2885, 73.3655],
    "Hostel Cluster Central": [22.2905, 73.3662],
    "Hostel Cluster North": [22.2922, 73.3650],
    "Hostel Cluster East": [22.2910, 73.3670],
    "Hostel Cluster South": [22.2890, 73.3665],
    "Exit Gate": [22.2881, 73.3631],
    "Management Block": [22.2891, 73.3628],
    "Homoeopathy Block": [22.2896, 73.3625],
    "Design & Arts Hub": [22.2887, 73.3651],
    "CV Raman Centre": [22.2892, 73.3644],
    "Azad Bhawan": [22.2920, 73.3661],
    "Watchers Park": [22.2915, 73.3636],
    "Swimming Pool": [22.2906, 73.3634],
    "Temple": [22.2908, 73.3639],
    "Bank": [22.2890, 73.3633]
};

// Map simulation helpers (Parul Campus center: 22.2897, 73.3641)
const getCoord = (str) => {
    // Check if we have exact coordinates mapped (case insensitive)
    const normalized = str.toLowerCase();
    for (const [key, coords] of Object.entries(CAMPUS_COORDS)) {
        if (normalized.includes(key.toLowerCase())) {
            return coords;
        }
    }
    // Generate tighter pseudo-random coordinates strictly inside the campus
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const rand1 = ((hash % 1000) / 1000) * 0.004 - 0.002;
    const rand2 = (((hash/100) % 1000) / 1000) * 0.004 - 0.002;
    return [22.2897 + rand1, 73.3641 + rand2];
}

const generatedDrivers = RAW_STOPS.map((s, idx) => ({ id: idx + 1, name: s.driver, role: 'driver', mobile: s.phone, status: 'available' }));
const generatedVehicles = RAW_STOPS.map((s, idx) => {
    const coords = getCoord(s.id + ' - ' + s.name);
    return {
        id: idx + 1,
        name: s.id + ' - ' + s.name,
        type: 'Shuttle',
        capacity: 15,
        status: 'Active',
        driverId: idx + 1,
        lat: coords[0],
        lng: coords[1]
    };
});

const db = {
    users: [
        { id: 1, name: 'Alice Student', role: 'user', mobile: '555-0100', verified: true },
        { id: 2, name: 'Bob Admin', role: 'admin', mobile: '555-0200', verified: true }
    ],
    drivers: generatedDrivers,
    vehicles: generatedVehicles,
    rideRequests: [] // UBER STYLE
};

// OTP store in-memory
const pendingOTPs = {};

// 0. General Endpoints
app.get('/api/drivers', (req, res) => res.json(db.drivers));

// 1. Auth Endpoint
app.post('/api/auth/login', (req, res) => {
    const { role, id, name, mobile } = req.body;
    let user;
    if (role === 'user') {
        if (!mobile || mobile.length !== 13) {
            return res.status(400).json({ success: false, message: '13-digit mobile number required' });
        }
        user = db.users.find(u => u.mobile === mobile);
        if (!user) {
            user = { id: db.users.length + 1, name: name || 'Student', role: 'user', mobile, verified: false };
            db.users.push(user);
        }
    } else if (role === 'admin') {
        user = db.users.find(u => u.id === parseInt(id) && u.role === role);
    } else if (role === 'driver') {
        user = db.drivers.find(d => d.id === parseInt(id));
    }

    if (user) {
        res.json({ success: true, user });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Google Authentication Sign-In
app.post('/api/auth/google-login', (req, res) => {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    
    let user = db.users.find(u => u.email === email);
    if (!user) {
        user = {
            id: db.users.length + 1,
            name: name || 'Google User',
            email: email,
            role: 'user',
            mobile: '',
            verified: false
        };
        db.users.push(user);
    }
    res.json({ success: true, user });
});

// Send Verification OTP (Simulated SMS)
app.post('/api/auth/send-otp', (req, res) => {
    const { mobile, userId } = req.body;
    const uId = parseInt(userId);
    const user = db.users.find(u => u.id === uId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    if (mobile) {
        // Enforce 13-digit mobile check
        if (mobile.length !== 13) {
            return res.status(400).json({ success: false, message: '13-digit mobile number required' });
        }
        user.mobile = mobile;
    }
    
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    pendingOTPs[uId] = code;
    
    console.log(`\n========================================`);
    console.log(`[SMS SIMULATION] Verification OTP for user: ${user.name}`);
    console.log(`[SMS SIMULATION] Mobile: ${user.mobile || 'None'}`);
    console.log(`[SMS SIMULATION] Verification Code: ${code}`);
    console.log(`========================================\n`);
    
    res.json({ success: true, code, message: 'Simulated OTP sent successfully' });
});

// Verify OTP code
app.post('/api/auth/verify-otp', (req, res) => {
    const { userId, code } = req.body;
    const uId = parseInt(userId);
    
    if (pendingOTPs[uId] && pendingOTPs[uId] === code) {
        const user = db.users.find(u => u.id === uId);
        if (user) {
            user.verified = true;
        }
        delete pendingOTPs[uId];
        res.json({ success: true, user });
    } else {
        res.status(400).json({ success: false, message: 'Invalid verification code' });
    }
});

// 2. Admin Endpoints (Unchanged functionality)
app.get('/api/admin/data', (req, res) => {
    res.json({ vehicles: db.vehicles, drivers: db.drivers, users: db.users });
});

// 3. Driver Endpoints (UBER STYLE)
app.get('/api/driver/requests', (req, res) => {
    // Get all pending requests
    const pending = db.rideRequests.filter(r => r.status === 'Pending');
    res.json(pending);
});

app.post('/api/driver/accept-ride', (req, res) => {
    const { driverId, requestId } = req.body;
    const request = db.rideRequests.find(r => r.id === requestId);
    const driver = db.drivers.find(d => d.id === driverId);
    const vehicle = db.vehicles.find(v => v.driverId === driverId);
    
    if (request && request.status === 'Pending' && driver && vehicle) {
        request.status = 'Accepted';
        request.driverId = driver.id;
        request.vehicleId = vehicle.id;
        request.driverLat = vehicle.lat || getCoord(vehicle.name)[0];
        request.driverLng = vehicle.lng || getCoord(vehicle.name)[1];
        driver.status = 'busy';
        res.json({ success: true, request });
    } else {
        res.status(400).json({ success: false, message: 'Cannot accept ride' });
    }
});

app.get('/api/driver/assignments/:driverId', (req, res) => {
    const driverId = parseInt(req.params.driverId);
    const assignedVehicle = db.vehicles.find(v => v.driverId === driverId);
    const activeRequests = db.rideRequests.filter(r => r.driverId === driverId && r.status === 'Accepted');
    res.json({ assignedVehicle, activeBookings: activeRequests });
});

// 4. User Endpoints (UBER STYLE)
app.post('/api/user/request-ride', (req, res) => {
    const { userId, pickupLocation, dropoffLocation } = req.body;
    // create a ride request
    const user = db.users.find(u => u.id === userId);
    
    // Clear any previous requests for this user
    db.rideRequests = db.rideRequests.filter(r => r.userId !== userId);
    
    const pCoords = getCoord(pickupLocation);
    const newRequest = {
        id: db.rideRequests.length + 1,
        userId,
        userName: user ? user.name : 'User',
        pickupLocation,
        dropoffLocation,
        pickupCoords: pCoords,
        dropoffCoords: getCoord(dropoffLocation),
        userLat: pCoords[0],
        userLng: pCoords[1],
        status: 'Pending',
        driverId: null,
        vehicleId: null,
        driverLat: 0,
        driverLng: 0,
        timestamp: new Date().toISOString()
    };
    db.rideRequests.push(newRequest);
    res.json({ success: true, request: newRequest });
});

app.get('/api/user/ride-status/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const request = db.rideRequests.find(r => r.userId === userId);
    if (!request) return res.json({ success: false, status: 'NoRide' });
    
    let driverInfo = null;
    if (request.status === 'Accepted') {
        driverInfo = db.drivers.find(d => d.id === request.driverId);
        const vehicle = db.vehicles.find(v => v.id === request.vehicleId);
        if(driverInfo) {
            driverInfo.vehicleName = vehicle ? vehicle.name : '';
            driverInfo.vehicleType = vehicle ? vehicle.type : 'Shuttle';
        }
    }
    
    res.json({ success: true, request, driverInfo });
});


// 5. GPS Tracking Live Update Endpoints
app.post('/api/driver/update-location', (req, res) => {
    const { driverId, lat, lng } = req.body;
    const dId = parseInt(driverId);
    
    // Update vehicle's stored live coordinates
    const vehicle = db.vehicles.find(v => v.driverId === dId);
    if (vehicle) {
        vehicle.lat = lat;
        vehicle.lng = lng;
    }
    
    // Update active ride request coordinates
    db.rideRequests.forEach(r => {
        if (r.driverId === dId && r.status === 'Accepted') {
            r.driverLat = lat;
            r.driverLng = lng;
            r.driverGpsOverride = true; // prevent physics engine overwrite
        }
    });
    res.json({ success: true });
});

app.post('/api/user/update-location', (req, res) => {
    const { userId, lat, lng } = req.body;
    const uId = parseInt(userId);
    
    // Update active ride requests user coordinates
    db.rideRequests.forEach(r => {
        if (r.userId === uId) {
            r.userLat = lat;
            r.userLng = lng;
        }
    });
    res.json({ success: true });
});

app.get('/api/vehicles/live', (req, res) => {
    const liveVehicles = db.vehicles.map(v => {
        const driver = db.drivers.find(d => d.id === v.driverId);
        const activeRequest = db.rideRequests.find(r => r.driverId === v.driverId && r.status === 'Accepted');
        return {
            id: v.id,
            name: v.name,
            status: v.status,
            driverId: v.driverId,
            driverName: driver ? driver.name : 'Unknown',
            lat: activeRequest ? activeRequest.driverLat : (v.lat || getCoord(v.name)[0]),
            lng: activeRequest ? activeRequest.driverLng : (v.lng || getCoord(v.name)[1])
        };
    });
    res.json(liveVehicles);
});

// Global Server Physics Engine
setInterval(() => {
    db.rideRequests.forEach(req => {
        if (req.status === 'Accepted' && !req.driverGpsOverride) {
            // Smoothly move the driver 2% closer to the pickup every second
            req.driverLat += (req.pickupCoords[0] - req.driverLat) * 0.02;
            req.driverLng += (req.pickupCoords[1] - req.driverLng) * 0.02;
        }
    });
}, 1000);

app.listen(PORT, () => {
    console.log('Backend server listening on port ' + PORT);
});

