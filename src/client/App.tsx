import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RoomCreate from './components/RoomCreate';
import RoomPage from './components/RoomPage';

/**
 * HomePage - Landing page with room creation
 */
function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-4">
        <header className="mb-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <img
              src="/listener-logo.png"
              alt="Listener"
              className="h-80 w-auto"
            />
          </div>
          <p className="text-gray-400 text-lg">Collaborative Real-Time DJ Playlist Tool</p>
        </header>

        <main>
          <RoomCreate />
        </main>

        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Phase 1.1: Room Creation ✓ | Phase 1.2: Join Room ✓</p>
        </footer>
      </div>
    </div>
  );
}

/**
 * App - Main application with routing
 */
function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rooms/:roomId" element={<RoomPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
