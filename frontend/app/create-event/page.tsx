import React from 'react';
import { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import CreateEventPageContent from './create-event-page-content'; // Import the new client component

export const metadata: Metadata = {
  title: 'Create New Event | UIS Event Hub',
  description: 'Create and automatically promote your UIS community event with AI-generated content',
};

export default function CreateEventPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <CreateEventPageContent />
      </div>
    </MainLayout>
  );
}