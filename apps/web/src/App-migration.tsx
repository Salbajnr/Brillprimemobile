import React from 'react';

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #4682b4 0%, #0b1a51 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '3rem 2rem',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(70, 130, 180, 0.3)',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '20px'
      }}>
        <h1 style={{
          color: '#4682b4',
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '1rem',
          margin: 0
        }}>
          Brillprime
        </h1>
        <h2 style={{
          color: '#0b1a51',
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '1.5rem'
        }}>
          Financial Solutions Platform
        </h2>
        <div style={{
          backgroundColor: '#f0f8ff',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '2px solid #4682b4'
        }}>
          <h3 style={{
            color: '#0b1a51',
            fontSize: '1.2rem',
            fontWeight: '600',
            marginBottom: '1rem'
          }}>
            ✅ Migration Successful!
          </h3>
          <p style={{
            color: '#333',
            margin: '0.5rem 0',
            fontSize: '1rem'
          }}>
            Your project has been successfully migrated from Replit Agent to the standard Replit environment.
          </p>
          <p style={{
            color: '#333',
            margin: '0.5rem 0',
            fontSize: '1rem'
          }}>
            The web application is now running with all core dependencies installed.
          </p>
        </div>
        <div style={{
          backgroundColor: '#fff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <h4 style={{
            color: '#0b1a51',
            fontSize: '1rem',
            fontWeight: '600',
            marginBottom: '0.5rem'
          }}>
            Ready for Development
          </h4>
          <p style={{
            color: '#666',
            margin: 0,
            fontSize: '0.9rem'
          }}>
            You can now continue building your financial services platform with CONSUMERs, MERCHANTs, and DRIVERs functionality.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;