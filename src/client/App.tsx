import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import RoomCreate from './components/RoomCreate';
import RoomPage from './components/RoomPage';
import LoginPage from './components/LoginPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

/**
 * ProtectedRoute - Requires authentication to access
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'monospace',
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    // Redirect to login, but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * HomePage - Landing page with room creation
 */
function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-4">
        {user && (
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {user.avatarUrl && (
                  <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                )}
                <span className="text-gray-300">{user.name}</span>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        )}

        <header className="mb-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <img src="/listener-logo.png" alt="Listener" className="h-60 w-auto" />
          </div>
          <p className="text-gray-400 text-lg">Collaborative Real-Time DJ Playlist Tool</p>
        </header>

        <main>
          <RoomCreate />
        </main>

        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Vibin&apos; with Fauli since 2025 🎧</p>
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
      <AuthProvider>
        <div className="min-h-screen bg-gray-900 text-white">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rooms/:roomId"
              element={
                <ProtectedRoute>
                  <RoomPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
