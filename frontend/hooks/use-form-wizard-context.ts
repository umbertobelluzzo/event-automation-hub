import React, { createContext, useContext } from 'react';
import { EventFormData, FormValidationError } from '@/shared/types';

// =============================================================================
// Form Wizard Context Type
// =============================================================================

export interface FormWizardContextType {
  // Form State
  formData: EventFormData;
  currentStep: number;
  errors: FormValidationError[];
  isSubmitting: boolean;
  
  // Actions
  updateFormData: (updates: Partial<EventFormData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepIndex: number) => void;
  validateCurrentStep: () => boolean;
  submitForm: () => Promise<void>;
  resetForm: () => void;
  
  // State Queries
  canProceed: boolean;
  canGoBack: boolean;
  getStepProgress: () => number;
}

// =============================================================================
// Context Creation
// =============================================================================

const FormWizardContext = createContext<FormWizardContextType | null>(null);

// =============================================================================
// Context Provider Component
// =============================================================================

interface FormWizardProviderProps {
  children: React.ReactNode;
  value: FormWizardContextType;
}

export const FormWizardProvider: React.FC<FormWizardProviderProps> = ({
  children,
  value,
}) => (
  <FormWizardContext.Provider value={value}>
    {children}
  </FormWizardContext.Provider>
);

// =============================================================================
// Context Hook
// =============================================================================

export const useFormWizardContext = (): FormWizardContextType => {
  const context = useContext(FormWizardContext);
  
  if (!context) {
    throw new Error(
      'useFormWizardContext must be used within a FormWizardProvider. ' +
      'Make sure to wrap your form components with FormWizardProvider.'
    );
  }
  
  return context;
};