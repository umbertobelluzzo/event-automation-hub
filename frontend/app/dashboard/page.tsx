import { Metadata } from 'next';
import Link from 'next/link';
import { SimpleAuthGuard } from '@/components/auth/simple-auth-guard';

export const metadata: Metadata = {
  title: 'Dashboard | UIS Event Hub',
  description: 'Manage your UIS events',
};

// Mock data - will be replaced with real API calls
const mockEvents = [
  {
    id: '1',
    title: 'Italian Language Workshop',
    date: '2024-02-15',
    status: 'published',
    attendees: 25
  },
  {
    id: '2',
    title: 'Cinema Night: La Vita è Bella',
    date: '2024-02-22',
    status: 'draft',
    attendees: 0
  },
  {
    id: '3',
    title: 'Virtual Pasta Making Class',
    date: '2024-03-01',
    status: 'in_review',
    attendees: 12
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'published': return '#28a745';
    case 'draft': return '#6c757d';
    case 'in_review': return '#ffc107';
    default: return '#6c757d';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'published': return 'Published';
    case 'draft': return 'Draft';
    case 'in_review': return 'In Review';
    default: return status;
  }
};

export default function DashboardPage() {
  return (
    <SimpleAuthGuard>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', color: '#333' }}>
              Dashboard
            </h1>
            <p style={{ margin: 0, color: '#666' }}>
              Manage your UIS events and view analytics
            </p>
          </div>
          <Link
            href="/create-event"
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
            + New Event
          </Link>
        </div>

        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#009246' }}>
              {mockEvents.length}
            </h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Total Events</p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#28a745' }}>
              {mockEvents.filter(e => e.status === 'published').length}
            </h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Published</p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#ffc107' }}>
              {mockEvents.reduce((sum, e) => sum + e.attendees, 0)}
            </h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Total Attendees</p>
          </div>
        </div>

        {/* Events List */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
              Recent Events
            </h2>
          </div>
          
          <div>
            {mockEvents.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                <p>No events yet. Create your first event!</p>
                <Link
                  href="/create-event"
                  style={{
                    display: 'inline-block',
                    marginTop: '16px',
                    padding: '10px 20px',
                    backgroundColor: '#009246',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px'
                  }}
                >
                  Create Event
                </Link>
              </div>
            ) : (
              mockEvents.map((event, index) => (
                <div
                  key={event.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: index < mockEvents.length - 1 ? '1px solid #e0e0e0' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#333' }}>
                      {event.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                      {new Date(event.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      {event.attendees} attendees
                    </span>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: getStatusColor(event.status),
                        color: 'white'
                      }}
                    >
                      {getStatusLabel(event.status)}
                    </span>
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f8f9fa',
                        color: '#333',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        border: '1px solid #e0e0e0'
                      }}
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ 
          marginTop: '40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#333' }}>
              🎨 AI Content
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
              Let AI generate flyers, social posts, and promotional content for your events.
            </p>
            <Link
              href="/create-event"
              style={{
                display: 'inline-block',
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
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#333' }}>
              📊 Analytics
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
              View detailed analytics about your events, attendance, and engagement.
            </p>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: '#f8f9fa',
                color: '#666',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'not-allowed'
              }}
              disabled
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </SimpleAuthGuard>
  );
}