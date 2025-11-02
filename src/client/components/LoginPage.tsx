/**
 * LoginPage - OAuth login screen
 */

import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, loading, loginWithGitHub } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect to where they were going (or home)
  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'monospace'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      fontFamily: 'monospace'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
        padding: '40px',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎧</h1>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Listener</h2>
        <p style={{ color: '#999', marginBottom: '30px' }}>
          Collaborative DJ Set Planner
        </p>

        <button
          onClick={loginWithGitHub}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#24292e',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2f363d';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#24292e';
          }}
        >
          <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Sign in with GitHub
        </button>

        <p style={{
          marginTop: '20px',
          fontSize: '12px',
          color: '#666'
        }}>
          Sign in to create rooms and collaborate on DJ sets
        </p>
      </div>
    </div>
  );
}
