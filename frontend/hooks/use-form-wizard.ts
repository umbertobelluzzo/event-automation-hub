import { useState, useCallback, useEffect } from 'react';
import { EventFormData, FormStepInfo, FormValidationError } from '@/shared/types';

// =============================================================================
// Form Steps Configuration
// =============================================================================

export const FORM_STEPS: Omit<FormStepInfo, 'isCompleted' | 'isActive' | 'hasErrors'>[] = [
  {
    id: 'basics',
    title: 'Event Basics',
    description: 'Tell us about your event - type, title, and description',
  },
  {
    id: 'datetime',
    title: 'Date & Location',
    description: 'When and where will your event take place?',
  },
  {
    id: 'tickets',
    title: 'Tickets & Registration',
    description: 'Set up pricing and registration requirements',
  },
  {
    id: 'content',
    title: 'AI Content Preferences',
    description: 'Help our AI create the perfect promotional materials',
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Review all details before creating your event',
  },
];

// =============================================================================
// Default Form Data
// =============================================================================

const getDefaultFormData = (): EventFormData => ({
  // Step 1: Event Basics
  eventType: 'community',
  title: '',
  description: '',
  
  // Step 2: Date & Location
  startDate: new Date(),
  timezone: 'Europe/London',
  location: {
    name: '',
    address: '',
    isOnline: false,
  },
  
  // Step 3: Ticket & Registration
  ticketInfo: {
    isFree: true,
    registrationRequired: false,
    currency: 'GBP',
  },
  
  // Step 4: AI Content Preferences
  contentPreferences: {
    flyerStyle: 'professional',
    targetAudience: [],
    keyMessages: [],
    socialTone: 'friendly',
    includeLogo: true,
  },
  
  // Step 5: Review & Metadata
  tags: [],
  isPublic: true,
});

// =============================================================================
// Form Wizard Hook
// =============================================================================

export interface UseFormWizardReturn {
  // Current state
  currentStep: number;
  formData: EventFormData;
  steps: FormStepInfo[];
  errors: FormValidationError[];
  isSubmitting: boolean;
  canProceed: boolean;
  canGoBack: boolean;
  
  // Actions
  updateFormData: (updates: Partial<EventFormData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepIndex: number) => void;
  validateCurrentStep: () => boolean;
  submitForm: () => Promise<void>;
  resetForm: () => void;
  
  // Utilities
  getStepProgress: () => number;
  getCurrentStepData: () => Partial<EventFormData>;
}

export const useFormWizard = (): UseFormWizardReturn => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<EventFormData>(getDefaultFormData);
  const [errors, setErrors] = useState<FormValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =============================================================================
  // Validation Logic
  // =============================================================================

  const validateStep = useCallback((stepIndex: number, data: EventFormData): FormValidationError[] => {
    const stepErrors: FormValidationError[] = [];

    switch (stepIndex) {
      case 0: // Event Basics
        if (!data.title.trim()) {
          stepErrors.push({ field: 'title', message: 'Event title is required', step: 0 });
        }
        if (!data.description.trim()) {
          stepErrors.push({ field: 'description', message: 'Event description is required', step: 0 });
        }
        if (data.title.length > 100) {
          stepErrors.push({ field: 'title', message: 'Title must be less than 100 characters', step: 0 });
        }
        break;

      case 1: // Date & Location
        if (!data.startDate) {
          stepErrors.push({ field: 'startDate', message: 'Start date is required', step: 1 });
        }
        if (data.startDate && data.startDate < new Date()) {
          stepErrors.push({ field: 'startDate', message: 'Start date cannot be in the past', step: 1 });
        }
        if (data.endDate && data.endDate < data.startDate) {
          stepErrors.push({ field: 'endDate', message: 'End date cannot be before start date', step: 1 });
        }
        if (!data.location.name.trim()) {
          stepErrors.push({ field: 'location.name', message: 'Location name is required', step: 1 });
        }
        if (!data.location.isOnline && !data.location.address.trim()) {
          stepErrors.push({ field: 'location.address', message: 'Address is required for in-person events', step: 1 });
        }
        if (data.location.isOnline && !data.location.meetingLink) {
          stepErrors.push({ field: 'location.meetingLink', message: 'Meeting link is required for online events', step: 1 });
        }
        break;

      case 2: // Tickets & Registration
        if (!data.ticketInfo.isFree && (!data.ticketInfo.price || data.ticketInfo.price <= 0)) {
          stepErrors.push({ field: 'ticketInfo.price', message: 'Ticket price must be greater than 0', step: 2 });
        }
        if (data.ticketInfo.maxAttendees && data.ticketInfo.maxAttendees < 1) {
          stepErrors.push({ field: 'ticketInfo.maxAttendees', message: 'Maximum attendees must be at least 1', step: 2 });
        }
        break;

      case 3: // Content Preferences
        if (data.contentPreferences.targetAudience.length === 0) {
          stepErrors.push({ field: 'contentPreferences.targetAudience', message: 'Please select at least one target audience', step: 3 });
        }
        if (data.contentPreferences.keyMessages.length === 0) {
          stepErrors.push({ field: 'contentPreferences.keyMessages', message: 'Please add at least one key message', step: 3 });
        }
        break;

      case 4: // Review - No additional validation needed
        break;
    }

    return stepErrors;
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    const stepErrors = validateStep(currentStep, formData);
    
    // Remove errors for other steps, keep only current step errors
    const otherStepErrors = errors.filter(error => error.step !== currentStep);
    setErrors([...otherStepErrors, ...stepErrors]);
    
    return stepErrors.length === 0;
  }, [currentStep, formData, errors, validateStep]);

  // =============================================================================
  // Step Management
  // =============================================================================

  const updateFormData = useCallback((updates: Partial<EventFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    if (validateCurrentStep() && currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, validateCurrentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < FORM_STEPS.length) {
      setCurrentStep(stepIndex);
    }
  }, []);

  // =============================================================================
  // Form Submission
  // =============================================================================

  const submitForm = useCallback(async () => {
    // Validate all steps before submission
    let allErrors: FormValidationError[] = [];
    for (let i = 0; i < FORM_STEPS.length; i++) {
      const stepErrors = validateStep(i, formData);
      allErrors = [...allErrors, ...stepErrors];
    }

    if (allErrors.length > 0) {
      setErrors(allErrors);
      // Go to first step with errors
      const firstErrorStep = Math.min(...allErrors.map(e => e.step));
      setCurrentStep(firstErrorStep);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Implement actual API call
      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      const result = await response.json();
      
      if (result.success) {
        // TODO: Redirect to success page or AI workflow status
        console.log('Event created successfully:', result);
      } else {
        setErrors(result.errors || []);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors([{
        field: 'general',
        message: 'Failed to create event. Please try again.',
        step: currentStep,
      }]);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateStep, currentStep]);

  const resetForm = useCallback(() => {
    setFormData(getDefaultFormData());
    setCurrentStep(0);
    setErrors([]);
    setIsSubmitting(false);
  }, []);

  // =============================================================================
  // Computed Properties
  // =============================================================================

  const steps: FormStepInfo[] = FORM_STEPS.map((step, index) => ({
    ...step,
    isActive: index === currentStep,
    isCompleted: index < currentStep || (index === currentStep && validateStep(index, formData).length === 0),
    hasErrors: errors.some(error => error.step === index),
  }));

  const canProceed = currentStep < FORM_STEPS.length - 1 && validateStep(currentStep, formData).length === 0;
  const canGoBack = currentStep > 0;

  const getStepProgress = useCallback((): number => {
    return ((currentStep + 1) / FORM_STEPS.length) * 100;
  }, [currentStep]);

  const getCurrentStepData = useCallback((): Partial<EventFormData> => {
    switch (currentStep) {
      case 0:
        return {
          eventType: formData.eventType,
          title: formData.title,
          description: formData.description,
        };
      case 1:
        return {
          startDate: formData.startDate,
          endDate: formData.endDate,
          timezone: formData.timezone,
          location: formData.location,
        };
      case 2:
        return {
          ticketInfo: formData.ticketInfo,
        };
      case 3:
        return {
          contentPreferences: formData.contentPreferences,
        };
      case 4:
        return formData;
      default:
        return {};
    }
  }, [currentStep, formData]);

  return {
    // Current state
    currentStep,
    formData,
    steps,
    errors,
    isSubmitting,
    canProceed,
    canGoBack,
    
    // Actions
    updateFormData,
    nextStep,
    prevStep,
    goToStep,
    validateCurrentStep,
    submitForm,
    resetForm,
    
    // Utilities
    getStepProgress,
    getCurrentStepData,
  };
};