import React from 'react';
import { Metadata } from 'next';

import { FormWizard } from '@/components/forms/form-wizard';
import { FormWizardProvider } from '@/hooks/use-form-wizard-context';
import { useFormWizard } from '@/hooks/use-form-wizard';

export const metadata: Metadata = {
  title: 'Create New Event | UIS Event Hub',
  description: 'Create and automatically promote your UIS community event with AI-generated content',
};

// =============================================================================
// Create Event Page Wrapper
// =============================================================================

const CreateEventPageContent: React.FC = () => {
  const formWizardProps = useFormWizard();

  return (
    <FormWizardProvider value={formWizardProps}>
      <FormWizard />
    </FormWizardProvider>
  );
};

// =============================================================================
// Main Create Event Page
// =============================================================================

const CreateEventPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <CreateEventPageContent />
    </div>
  );
};

export default CreateEventPage;