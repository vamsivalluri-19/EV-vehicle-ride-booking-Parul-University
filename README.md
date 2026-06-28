# Smart Campus EV Ride Booking System (Parul University)

A Progressive Web App (PWA) built to manage electric vehicle (EV) shuttle and bus bookings across the **Parul University** campus. Features precise satellite map navigation, dynamic road routing, Google Sign-in authentication, and OTP mobile activation.

---

## 🚀 Key Features

* **📍 Parul University Coordinate Database**: Precise building and landmark coordinates mapped for Parul (Main Entry Gate, Hostels, Sevashram Hospital, Academic Blocks, Food Courts, and Grounds).
* **🛣️ Real-Road Routing (OSRM)**: Leverages the open-source OSRM routing engine to draw exact routes along campus roads rather than straight lines (Driver ➔ Passenger ➔ Dropoff).
* **🤖 Auto-Drive Simulator**: The Driver Dashboard includes a mock auto-drive simulator that moves the vehicle node-by-node along the computed road network coordinates.
* **📱 Progressive Web App (PWA)**: Download and install the application directly onto your Android (Google Chrome) or iOS (Apple Safari) home screen as a full-screen, standalone app.
* **🔐 Google Login Integration**: Supports mock-based Google Sign-in authentication for local testing and developer integration.
* **📲 2-Step SMS/OTP Verification**: New students must link a 13-digit mobile number and verify it using a simulated on-screen SMS notification dialog to activate their profiles.
* **🗺️ Reference Map Overlay**: Instantly display a zoomable/pan-able overlay of the official Parul University campus map image for easy navigation.

---

## 🛠️ Tech Stack

* **Frontend**: React (Vite), Leaflet Map API, React Leaflet, Lucide Icons, Vanilla CSS
* **Backend**: Node.js, Express.js, CORS
* **Routing API**: OpenStreetMap Routing Machine (OSRM)

---

## 📦 Local Installation & Setup

Clone the repository and follow the setup instructions for both frontend and backend.

### 1. Backend Server Setup
1. Navigate to the backend directory:
   ```bash
   cd smart-campus-ev-system/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the backend:
   ```bash
   npm start
   ```
   *The backend will boot up on port `5000`.*

### 2. Frontend Web App Setup
1. Navigate to the frontend directory:
   ```bash
   cd smart-campus-ev-system/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web app in your browser or mobile phone:
   * **Local**: `http://localhost:5173/`
   * **Local Network (Wi-Fi)**: `http://192.168.1.4:5173/`

---

## 🌐 Production Deployment

This project is optimized and pre-configured for simple cloud deployments.

### Backend (Render)
* **Start Command**: `npm start`
* **Root Directory**: `smart-campus-ev-system/backend`
* Render will automatically bind the server to `process.env.PORT`.

### Frontend (Vercel)
* **Framework Preset**: `Vite`
* **Root Directory**: `smart-campus-ev-system/frontend`
* **Output Directory**: `dist`
* **Environment Variables**: Set `VITE_API_BASE` pointing to your deployed Render API (e.g. `https://your-backend.onrender.com`).
* Includes a pre-configured `vercel.json` routing rewrite file to handle page reloads on client routes.