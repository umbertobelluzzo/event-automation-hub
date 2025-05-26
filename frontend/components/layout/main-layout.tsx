'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SimpleUserInfo } from '@/components/auth/simple-user-info';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const pathname = usePathname();

  // Don't show header on auth pages
  if (pathname.startsWith('/auth/')) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '0 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px'
        }}>
          {/* Logo */}
          <Link 
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: '#333'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#009246',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              UIS
            </div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
              Event Hub
            </h1>
          </Link>

          {/* Navigation */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link 
              href="/dashboard"
              style={{
                textDecoration: 'none',
                color: pathname === '/dashboard' ? '#009246' : '#666',
                fontWeight: pathname === '/dashboard' ? 'bold' : 'normal'
              }}
            >
              Dashboard
            </Link>
            <Link 
              href="/create-event"
              style={{
                padding: '8px 16px',
                backgroundColor: '#009246',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              Create Event
            </Link>
            <SimpleUserInfo />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#333',
        color: 'white',
        textAlign: 'center',
        padding: '20px',
        marginTop: '40px'
      }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
          © 2024 United Italian Societies - Event Management Hub
        </p>
      </footer>
    </div>
  );
};