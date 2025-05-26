import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      padding: '20px'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '500px' }}>
        {/* UIS Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#009246',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '20px'
          }}>
            UIS
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
            Event Hub
          </h1>
        </div>

        {/* 404 Error */}
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: '#009246',
            margin: '0 0 16px 0'
          }}>
            404
          </h1>
          
          <h2 style={{
            fontSize: '24px',
            color: '#333',
            margin: '0 0 16px 0'
          }}>
            Page Not Found
          </h2>
          
          <p style={{
            color: '#666',
            fontSize: '16px',
            margin: '0 0 32px 0',
            lineHeight: '1.5'
          }}>
            Sorry, we couldn't find the page you're looking for. 
            The page might have been moved, deleted, or the URL might be incorrect.
          </p>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Link
              href="/"
              style={{
                padding: '12px 24px',
                backgroundColor: '#009246',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Go Home
            </Link>
            
            <Link
              href="/dashboard"
              style={{
                padding: '12px 24px',
                backgroundColor: 'white',
                color: '#009246',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                border: '2px solid #009246'
              }}
            >
              Dashboard
            </Link>
            
            <Link
              href="/create-event"
              style={{
                padding: '12px 24px',
                backgroundColor: '#f8f9fa',
                color: '#333',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                border: '1px solid #e0e0e0'
              }}
            >
              Create Event
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <p style={{
          marginTop: '24px',
          fontSize: '14px',
          color: '#666'
        }}>
          Need help? Contact{' '}
          <a 
            href="mailto:support@uniteditalian.org"
            style={{ color: '#009246', textDecoration: 'none' }}
          >
            support@uniteditalian.org
          </a>
        </p>
      </div>
    </div>
  );
}