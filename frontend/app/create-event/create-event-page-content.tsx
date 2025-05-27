"use client";

import React from 'react';
import { FormWizard } from '@/components/forms/form-wizard';
import { FormWizardProvider } from '@/hooks/use-form-wizard-context';
import useFormWizard from '@/hooks/useFormWizard';

const CreateEventPageContent: React.FC = () => {
  const formWizardProps = useFormWizard();

  return (
    <FormWizardProvider value={formWizardProps}>
      <FormWizard />
    </FormWizardProvider>
  );
};

export default CreateEventPageContent; 