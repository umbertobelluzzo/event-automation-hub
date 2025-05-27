"use client";
import React from 'react';
import { Ticket, Users, PoundSterling, Calendar, AlertCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFormWizardContext } from '@/hooks/use-form-wizard-context';

// =============================================================================
// Currency Options
// =============================================================================

const CURRENCY_OPTIONS = [
  { value: 'GBP', label: '£ British Pound', symbol: '£' },
  { value: 'EUR', label: '€ Euro', symbol: '€' },
  { value: 'USD', label: '$ US Dollar', symbol: '$' },
];

// =============================================================================
// Free vs Paid Toggle Component
// =============================================================================

interface TicketTypeToggleProps {
  isFree: boolean;
  onChange: (isFree: boolean) => void;
}

const TicketTypeToggle: React.FC<TicketTypeToggleProps> = ({
  isFree,
  onChange,
}) => (
  <div className="space-y-3">
    <label className="text-sm font-medium text-gray-900">
      Event Pricing *
    </label>
    <div className="grid grid-cols-2 gap-3">
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200',
          {
            'ring-2 ring-green-500 shadow-md bg-green-50': isFree,
            'hover:ring-1 hover:ring-gray-300': !isFree,
          }
        )}
        onClick={() => onChange(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500 rounded-md text-white">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Free Event</h3>
              <p className="text-xs text-muted-foreground">No charge for attendees</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200',
          {
            'ring-2 ring-blue-500 shadow-md bg-blue-50': !isFree,
            'hover:ring-1 hover:ring-gray-300': isFree,
          }
        )}
        onClick={() => onChange(false)}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500 rounded-md text-white">
              <PoundSterling className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Paid Event</h3>
              <p className="text-xs text-muted-foreground">Charge admission fee</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// =============================================================================
// Pricing Configuration Component
// =============================================================================

interface PricingConfigProps {
  price: number;
  currency: string;
  onPriceChange: (price: number) => void;
  onCurrencyChange: (currency: string) => void;
  error?: string;
}

const PricingConfig: React.FC<PricingConfigProps> = ({
  price,
  currency,
  onPriceChange,
  onCurrencyChange,
  error,
}) => {
  const selectedCurrency = CURRENCY_OPTIONS.find(c => c.value === currency);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Price Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">
            Ticket Price *
          </label>
          <div className="relative">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={price || ''}
              onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
              className={cn('pl-8', {
                'border-red-500 focus-visible:ring-red-500': error,
              })}
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
              {selectedCurrency?.symbol}
            </span>
          </div>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>

        {/* Currency Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {CURRENCY_OPTIONS.map((curr) => (
              <option key={curr.value} value={curr.value}>
                {curr.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Payment Processing Note</p>
            <p>You'll need to set up your own payment processing (Stripe, PayPal, etc.) 
            or collect payments manually. This form creates the event structure only.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Registration Settings Component
// =============================================================================

interface RegistrationSettingsProps {
  registrationRequired: boolean;
  maxAttendees?: number;
  registrationDeadline?: Date;
  onRegistrationRequiredChange: (required: boolean) => void;
  onMaxAttendeesChange: (max?: number) => void;
  onRegistrationDeadlineChange: (deadline?: Date) => void;
  errors: {
    maxAttendees?: string;
    registrationDeadline?: string;
  };
}

const RegistrationSettings: React.FC<RegistrationSettingsProps> = ({
  registrationRequired,
  maxAttendees,
  registrationDeadline,
  onRegistrationRequiredChange,
  onMaxAttendeesChange,
  onRegistrationDeadlineChange,
  errors,
}) => (
  <div className="space-y-6">
    {/* Registration Required Toggle */}
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-900">
        Registration Settings
      </label>
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="registration-required"
          checked={registrationRequired}
          onChange={(e) => onRegistrationRequiredChange(e.target.checked)}
          className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
        />
        <label htmlFor="registration-required" className="text-sm text-gray-700">
          Require advance registration
        </label>
      </div>
      <p className="text-xs text-muted-foreground ml-7">
        If checked, people must register before attending
      </p>
    </div>

    {/* Capacity Limit */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        Maximum Attendees
      </label>
      <div className="relative">
        <Input
          type="number"
          min="1"
          placeholder="Leave empty for unlimited"
          value={maxAttendees || ''}
          onChange={(e) => onMaxAttendeesChange(e.target.value ? parseInt(e.target.value) : undefined)}
          className={cn('pl-10', {
            'border-red-500 focus-visible:ring-red-500': errors.maxAttendees,
          })}
        />
        <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      </div>
      {errors.maxAttendees && (
        <span className="text-xs text-red-500">{errors.maxAttendees}</span>
      )}
      <p className="text-xs text-muted-foreground">
        Set a limit to control event capacity (optional)
      </p>
    </div>

    {/* Registration Deadline */}
    {registrationRequired && (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">
          Registration Deadline
        </label>
        <div className="relative">
          <Input
            type="datetime-local"
            value={registrationDeadline ? 
              new Date(registrationDeadline.getTime() - registrationDeadline.getTimezoneOffset() * 60000)
                .toISOString().slice(0, 16) : ''}
            onChange={(e) => onRegistrationDeadlineChange(e.target.value ? new Date(e.target.value) : undefined)}
            className={cn({
              'border-red-500 focus-visible:ring-red-500': errors.registrationDeadline,
            })}
          />
          <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        {errors.registrationDeadline && (
          <span className="text-xs text-red-500">{errors.registrationDeadline}</span>
        )}
        <p className="text-xs text-muted-foreground">
          When should registration close? (Leave empty to allow registration until event starts)
        </p>
      </div>
    )}
  </div>
);

// =============================================================================
// Main Tickets Step Component
// =============================================================================

export const TicketsStep: React.FC = () => {
  const { formData, updateFormData, errors } = useFormWizardContext();

  // Get current step errors
  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  const handleTicketTypeChange = (isFree: boolean) => {
    updateFormData({
      ticketInfo: {
        ...formData.ticketInfo,
        isFree,
        ...(isFree && { price: undefined }), // Clear price if free
      },
    });
  };

  const handlePriceChange = (price: number) => {
    updateFormData({
      ticketInfo: {
        ...formData.ticketInfo,
        price,
      },
    });
  };

  const handleCurrencyChange = (currency: string) => {
    updateFormData({
      ticketInfo: {
        ...formData.ticketInfo,
        currency,
      },
    });
  };

  const handleRegistrationRequiredChange = (registrationRequired: boolean) => {
    updateFormData({
      ticketInfo: {
        ...formData.ticketInfo,
        registrationRequired,
      },
    });
  };

  const handleMaxAttendeesChange = (maxAttendees?: number) => {
    updateFormData({
      ticketInfo: {
        ...formData.ticketInfo,
        maxAttendees,
      },
    });
  };

  const handleRegistrationDeadlineChange = (registrationDeadline?: Date) => {
    updateFormData({
      ticketInfo: {
        ...formData.ticketInfo,
        registrationDeadline,
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Ticket Pricing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Ticket className="w-5 h-5" />
            <span>Ticket Pricing</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <TicketTypeToggle
            isFree={formData.ticketInfo.isFree}
            onChange={handleTicketTypeChange}
          />

          {!formData.ticketInfo.isFree && (
            <PricingConfig
              price={formData.ticketInfo.price || 0}
              currency={formData.ticketInfo.currency || 'GBP'}
              onPriceChange={handlePriceChange}
              onCurrencyChange={handleCurrencyChange}
              error={getError('ticketInfo.price')}
            />
          )}
        </CardContent>
      </Card>

      {/* Registration & Capacity Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Registration & Capacity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RegistrationSettings
            registrationRequired={formData.ticketInfo.registrationRequired}
            maxAttendees={formData.ticketInfo.maxAttendees}
            registrationDeadline={formData.ticketInfo.registrationDeadline}
            onRegistrationRequiredChange={handleRegistrationRequiredChange}
            onMaxAttendeesChange={handleMaxAttendeesChange}
            onRegistrationDeadlineChange={handleRegistrationDeadlineChange}
            errors={{
              maxAttendees: getError('ticketInfo.maxAttendees'),
              registrationDeadline: getError('ticketInfo.registrationDeadline'),
            }}
          />
        </CardContent>
      </Card>

      {/* Summary Preview */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Event Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <PoundSterling className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Price:</span>
              <span>
                {formData.ticketInfo.isFree 
                  ? 'Free' 
                  : `${CURRENCY_OPTIONS.find(c => c.value === formData.ticketInfo.currency)?.symbol}${formData.ticketInfo.price?.toFixed(2) || '0.00'}`
                }
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Capacity:</span>
              <span>{formData.ticketInfo.maxAttendees || 'Unlimited'}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Ticket className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Registration:</span>
              <span>{formData.ticketInfo.registrationRequired ? 'Required' : 'Optional'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-green-900 mb-2">
            🎟️ Ticketing Best Practices
          </h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Free events often have higher no-show rates - consider requiring registration</li>
            <li>• Set capacity limits to create urgency and manage venue constraints</li>
            <li>• For paid events, clearly communicate what's included in the ticket price</li>
            <li>• Consider early bird pricing or member discounts to boost registrations</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};