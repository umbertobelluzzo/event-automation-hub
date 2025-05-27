"use client";

import React from 'react';
import { FormWizard } from '@/components/forms/form-wizard';
import { FormWizardProvider } from '@/hooks/use-form-wizard-context';
import useFormWizard from '@/hooks/useFormWizard';

const CreateEventPageContent: React.FC = () => {
  const formWizardProps = useFormWizard();
  // console.log('[CreateEventPageContent] Rendering. formWizardProps.canProceed:', formWizardProps.canProceed, 'formWizardProps.errors:', formWizardProps.errors);

  return (
    <FormWizardProvider value={formWizardProps}>
      <FormWizard {...formWizardProps} />
    </FormWizardProvider>
  );
};

export default CreateEventPageContent; 