import React from 'react';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useFormWizard } from '@/hooks/use-form-wizard';

// Step Components
import { EventBasicsStep } from './steps/event-basics-step';
import { DateLocationStep } from './steps/date-location-step';
import { TicketsStep } from './steps/tickets-step';
import { ContentPreferencesStep } from './steps/content-preferences-step';
import { ReviewStep } from './steps/review-step';

// =============================================================================
// Progress Indicator Component
// =============================================================================

interface ProgressIndicatorProps {
  steps: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    isActive: boolean;
    hasErrors: boolean;
  }>;
  currentStep: number;
  progress: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  progress,
}) => (
  <div className="w-full space-y-4">
    {/* Progress Bar */}
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>Step {currentStep + 1} of {steps.length}</span>
      <span>{Math.round(progress)}% Complete</span>
    </div>
    <Progress value={progress} className="h-2" />
    
    {/* Step Indicators */}
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.id} className="flex flex-col items-center space-y-2">
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
              {
                'bg-primary border-primary text-primary-foreground': step.isActive,
                'bg-green-500 border-green-500 text-white': step.isCompleted,
                'bg-red-50 border-red-500 text-red-500': step.hasErrors,
                'bg-background border-muted-foreground text-muted-foreground': 
                  !step.isActive && !step.isCompleted && !step.hasErrors,
              }
            )}
          >
            {step.hasErrors ? (
              <AlertCircle className="w-4 h-4" />
            ) : step.isCompleted ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
          </div>
          <span className={cn(
            'text-xs text-center max-w-20',
            {
              'font-medium text-primary': step.isActive,
              'text-green-600': step.isCompleted,
              'text-red-500': step.hasErrors,
              'text-muted-foreground': !step.isActive && !step.isCompleted && !step.hasErrors,
            }
          )}>
            {step.title}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// =============================================================================
// Navigation Buttons Component
// =============================================================================

interface NavigationButtonsProps {
  canGoBack: boolean;
  canProceed: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  canGoBack,
  canProceed,
  isLastStep,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
}) => (
  <div className="flex items-center justify-between pt-6 border-t">
    <Button
      type="button"
      variant="outline"
      onClick={onBack}
      disabled={!canGoBack || isSubmitting}
    >
      Back
    </Button>
    
    <div className="flex items-center space-x-2">
      {isLastStep ? (
        <Button
          type="button"
          variant="italian"
          onClick={onSubmit}
          disabled={!canProceed || isSubmitting}
          className="min-w-32"
        >
          {isSubmitting ? 'Creating Event...' : 'Create Event'}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canProceed || isSubmitting}
        >
          Next Step
        </Button>
      )}
    </div>
  </div>
);

// =============================================================================
// Error Display Component
// =============================================================================

interface ErrorDisplayProps {
  errors: Array<{
    field: string;
    message: string;
    step: number;
  }>;
  currentStep: number;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errors, currentStep }) => {
  const currentStepErrors = errors.filter(error => error.step === currentStep);
  
  if (currentStepErrors.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <div className="flex items-center space-x-2 mb-2">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <h3 className="text-sm font-medium text-red-800">
          Please fix the following errors:
        </h3>
      </div>
      <ul className="text-sm text-red-700 space-y-1">
        {currentStepErrors.map((error, index) => (
          <li key={index}>• {error.message}</li>
        ))}
      </ul>
    </div>
  );
};

// =============================================================================
// Main Form Wizard Component
// =============================================================================

export const FormWizard: React.FC = () => {
  const {
    currentStep,
    steps,
    errors,
    isSubmitting,
    canProceed,
    canGoBack,
    getStepProgress,
    nextStep,
    prevStep,
    submitForm,
    resetForm,
  } = useFormWizard();

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <EventBasicsStep />;
      case 1:
        return <DateLocationStep />;
      case 2:
        return <TicketsStep />;
      case 3:
        return <ContentPreferencesStep />;
      case 4:
        return <ReviewStep />;
      default:
        return <div>Invalid step</div>;
    }
  };

  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
        <p className="text-gray-600">
          Follow the steps below to create your event and generate promotional materials automatically
        </p>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="p-6">
          <ProgressIndicator
            steps={steps}
            currentStep={currentStep}
            progress={getStepProgress()}
          />
        </CardContent>
      </Card>

      {/* Main Form Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{steps[currentStep]?.title}</span>
            {/* Reset Button (only show on review step) */}
            {isLastStep && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Start Over
              </Button>
            )}
          </CardTitle>
          <p className="text-muted-foreground">
            {steps[currentStep]?.description}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Error Display */}
          <ErrorDisplay errors={errors} currentStep={currentStep} />
          
          {/* Current Step Content */}
          <div className="min-h-96">
            {renderCurrentStep()}
          </div>
          
          {/* Navigation */}
          <NavigationButtons
            canGoBack={canGoBack}
            canProceed={canProceed}
            isLastStep={isLastStep}
            isSubmitting={isSubmitting}
            onBack={prevStep}
            onNext={nextStep}
            onSubmit={submitForm}
          />
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">?</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                Need Help?
              </h3>
              <p className="text-sm text-blue-700">
                Our AI will automatically generate a professional flyer, social media posts, 
                and WhatsApp messages based on your event details. You'll be able to review 
                and edit everything before publishing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};