import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';

export default function HomePage() {
  return (
    <MainLayout>
      <div style={{ backgroundColor: '#f8f9fa' }}>
        {/* Hero Section */}
        <section style={{ 
          background: 'linear-gradient(135deg, #009246 0%, #ffffff 50%, #ce2b37 100%)',
          padding: '80px 20px',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ 
              fontSize: '48px', 
              fontWeight: 'bold', 
              margin: '0 0 20px 0',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              AI-Powered Event Management
            </h1>
            <p style={{ 
              fontSize: '24px', 
              margin: '0 0 40px 0',
              maxWidth: '800px',
              marginLeft: 'auto',
              marginRight: 'auto',
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
            }}>
              Create, promote, and manage your UIS community events with 
              AI-generated flyers, social media posts, and automated workflows.
            </p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/create-event"
                style={{
                  padding: '16px 32px',
                  backgroundColor: 'white',
                  color: '#009246',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }}
              >
                ✨ Create Your First Event
              </Link>
              <Link
                href="/dashboard"
                style={{
                  padding: '16px 32px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '18px',
                  border: '2px solid white'
                }}
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section style={{ padding: '60px 20px', backgroundColor: 'white' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '40px',
              marginBottom: '60px'
            }}>
              <div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#009246', marginBottom: '8px' }}>
                  2-3 min
                </div>
                <div style={{ color: '#666', fontSize: '18px' }}>Setup Time</div>
              </div>
              <div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#009246', marginBottom: '8px' }}>
                  100%
                </div>
                <div style={{ color: '#666', fontSize: '18px' }}>AI-Generated Content</div>
              </div>
              <div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#009246', marginBottom: '8px' }}>
                  5+
                </div>
                <div style={{ color: '#666', fontSize: '18px' }}>Automated Tasks</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={{ padding: '60px 20px', backgroundColor: '#f8f9fa' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
              <h2 style={{ fontSize: '36px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>
                Everything You Need to Promote Your Event
              </h2>
              <p style={{ fontSize: '20px', color: '#666' }}>
                Our AI handles the heavy lifting so you can focus on creating amazing experiences
              </p>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '30px'
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '12px' }}>
                  AI Flyer Design
                </h3>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Professional flyers generated automatically using Canva API with UIS branding
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '12px' }}>
                  Social Media Posts
                </h3>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Instagram and LinkedIn captions tailored to your audience and event type
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '12px' }}>
                  Auto Scheduling
                </h3>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Calendar events and ClickUp tasks created automatically for team coordination
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '12px' }}>
                  WhatsApp Ready
                </h3>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Community broadcast messages formatted and ready to share
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{ 
          padding: '80px 20px',
          background: 'linear-gradient(135deg, #009246 0%, #ce2b37 100%)',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: '36px', 
              fontWeight: 'bold', 
              margin: '0 0 20px 0',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              Ready to Create Your Next Event?
            </h2>
            <p style={{ 
              fontSize: '20px', 
              margin: '0 0 40px 0',
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
            }}>
              Join other UIS volunteers who are saving hours on event promotion
            </p>
            <Link
              href="/create-event"
              style={{
                padding: '16px 32px',
                backgroundColor: 'white',
                color: '#009246',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
              }}
            >
              Get Started - It's Free
            </Link>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}