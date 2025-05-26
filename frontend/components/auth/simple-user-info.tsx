// =============================================================================
// components/auth/simple-user-info.tsx - Simple User Info Display
// =============================================================================

'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export const SimpleUserInfo: React.FC = () => {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div style={{ color: '#666', fontSize: '14px' }}>
        Loading...
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Link
        href="/auth/signin"
        style={{
          padding: '8px 16px',
          backgroundColor: '#009246',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '14px'
        }}
      >
        Sign In
      </Link>
    );
  }

  if (!session?.user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const userInitials = session.user.name
    ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : session.user.email?.[0].toUpperCase() || 'U';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #e0e0e0',
          backgroundColor: 'white'
        }}
        onClick={() => {
          const dropdown = document.getElementById('user-dropdown');
          if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
          }
        }}
      >
        {/* User Avatar */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#009246',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'User'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          ) : (
            userInitials
          )}
        </div>

        {/* User Info */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
            {session.user.name || 'User'}
          </div>
          <div style={{ fontSize: '12px', color: '#666', textTransform: 'capitalize' }}>
            {session.user.role?.toLowerCase() || 'member'}
          </div>
        </div>

        {/* Dropdown Arrow */}
        <div style={{ fontSize: '12px', color: '#666' }}>▼</div>
      </div>

      {/* Dropdown Menu */}
      <div
        id="user-dropdown"
        style={{
          display: 'none',
          position: 'absolute',
          top: '100%',
          right: '0',
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          minWidth: '200px',
          zIndex: 1000,
          marginTop: '4px'
        }}
      >
        {/* User Details */}
        <div style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
            {session.user.name || 'User'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {session.user.email}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#009246', 
            textTransform: 'uppercase',
            fontWeight: 'bold',
            marginTop: '4px'
          }}>
            {session.user.role}
          </div>
        </div>

        {/* Menu Items */}
        <div>
          <Link
            href="/dashboard"
            style={{
              display: 'block',
              padding: '12px',
              color: '#333',
              textDecoration: 'none',
              fontSize: '14px',
              borderBottom: '1px solid #f0f0f0'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            📊 Dashboard
          </Link>

          <Link
            href="/create-event"
            style={{
              display: 'block',
              padding: '12px',
              color: '#333',
              textDecoration: 'none',
              fontSize: '14px',
              borderBottom: '1px solid #f0f0f0'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✨ Create Event
          </Link>

          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#dc3545',
              textAlign: 'left',
              fontSize: '14px',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};