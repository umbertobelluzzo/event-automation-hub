import Link from 'next/link';
import { Sparkles, Calendar, Users, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-italian-green rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">UIS</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Event Hub</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/create-event">
                <Button variant="italian">Create Event</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              AI-Powered Event Management
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Create, promote, and manage your UIS community events with AI-generated 
              flyers, social media posts, and automated workflows.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Link href="/create-event">
                <Button size="lg" className="text-lg px-8 py-3" variant="italian">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Create Your First Event
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                View Demo
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-italian-green mb-2">2-3 min</div>
              <div className="text-gray-600">Setup Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-italian-green mb-2">100%</div>
              <div className="text-gray-600">AI-Generated Content</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-italian-green mb-2">5+</div>
              <div className="text-gray-600">Automated Tasks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Promote Your Event
            </h2>
            <p className="text-xl text-gray-600">
              Our AI handles the heavy lifting so you can focus on creating amazing experiences
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">AI Flyer Design</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Professional flyers generated automatically using Canva API with UIS branding
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Social Media Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Instagram and LinkedIn captions tailored to your audience and event type
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Auto Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Calendar events and ClickUp tasks created automatically for team coordination
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle className="text-lg">WhatsApp Ready</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Community broadcast messages formatted and ready to share
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-italian-green to-italian-red">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Create Your Next Event?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join other UIS volunteers who are saving hours on event promotion
          </p>
          <Link href="/create-event">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Get Started - It's Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-italian-green rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">UIS</span>
            </div>
            <span className="text-xl font-bold">United Italian Societies</span>
          </div>
          <p className="text-gray-400">
            Building community through technology and Italian culture
          </p>
        </div>
      </footer>
    </div>
  );
}