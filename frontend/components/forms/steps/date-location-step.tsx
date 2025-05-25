import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Globe, ExternalLink } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFormWizardContext } from '@/hooks/use-form-wizard-context';

// =============================================================================
// Timezone Options
// =============================================================================

const TIMEZONE_OPTIONS = [
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
];

// =============================================================================
// Location Type Toggle Component
// =============================================================================

interface LocationTypeToggleProps {
  isOnline: boolean;
  onChange: (isOnline: boolean) => void;
}

const LocationTypeToggle: React.FC<LocationTypeToggleProps> = ({
  isOnline,
  onChange,
}) => (
  <div className="space-y-3">
    <label className="text-sm font-medium text-gray-900">
      Event Format *
    </label>
    <div className="grid grid-cols-2 gap-3">
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200',
          {
            'ring-2 ring-primary shadow-md': !isOnline,
            'hover:ring-1 hover:ring-gray-300': isOnline,
          }
        )}
        onClick={() => onChange(false)}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500 rounded-md text-white">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">In-Person</h3>
              <p className="text-xs text-muted-foreground">Physical location</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200',
          {
            'ring-2 ring-primary shadow-md': isOnline,
            'hover:ring-1 hover:ring-gray-300': !isOnline,
          }
        )}
        onClick={() => onChange(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500 rounded-md text-white">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Online</h3>
              <p className="text-xs text-muted-foreground">Virtual event</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// =============================================================================
// Date Time Input Component
// =============================================================================

interface DateTimeInputProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
  required?: boolean;
  minDate?: Date;
}

const DateTimeInput: React.FC<DateTimeInputProps> = ({
  label,
  value,
  onChange,
  error,
  required = false,
  minDate,
}) => {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      onChange(newDate);
    }
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const minDateString = minDate ? formatDateForInput(minDate) : undefined;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {label} {required && '*'}
      </label>
      <div className="relative">
        <Input
          type="datetime-local"
          value={formatDateForInput(value)}
          onChange={handleDateChange}
          min={minDateString}
          className={cn({
            'border-red-500 focus-visible:ring-red-500': error,
          })}
        />
        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

// =============================================================================
// Location Details Component
// =============================================================================

interface LocationDetailsProps {
  isOnline: boolean;
  locationName: string;
  locationAddress: string;
  meetingLink?: string;
  onLocationNameChange: (name: string) => void;
  onLocationAddressChange: (address: string) => void;
  onMeetingLinkChange: (link: string) => void;
  errors: {
    locationName?: string;
    locationAddress?: string;
    meetingLink?: string;
  };
}

const LocationDetails: React.FC<LocationDetailsProps> = ({
  isOnline,
  locationName,
  locationAddress,
  meetingLink,
  onLocationNameChange,
  onLocationAddressChange,
  onMeetingLinkChange,
  errors,
}) => (
  <div className="space-y-4">
    {/* Location Name */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-900">
        {isOnline ? 'Event Platform/Name' : 'Venue Name'} *
      </label>
      <Input
        type="text"
        placeholder={
          isOnline
            ? 'e.g., Zoom Meeting, Microsoft Teams, Google Meet'
            : 'e.g., UIS Community Center, Royal Festival Hall'
        }
        value={locationName}
        onChange={(e) => onLocationNameChange(e.target.value)}
        className={cn({
          'border-red-500 focus-visible:ring-red-500': errors.locationName,
        })}
      />
      {errors.locationName && (
        <span className="text-xs text-red-500">{errors.locationName}</span>
      )}
    </div>

    {/* Location Address or Meeting Link */}
    {isOnline ? (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">
          Meeting Link *
        </label>
        <div className="relative">
          <Input
            type="url"
            placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-def-ghi"
            value={meetingLink || ''}
            onChange={(e) => onMeetingLinkChange(e.target.value)}
            className={cn({
              'border-red-500 focus-visible:ring-red-500': errors.meetingLink,
            })}
          />
          <ExternalLink className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
        {errors.meetingLink && (
          <span className="text-xs text-red-500">{errors.meetingLink}</span>
        )}
        <p className="text-xs text-muted-foreground">
          The meeting link will be shared with registered participants
        </p>
      </div>
    ) : (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">
          Venue Address *
        </label>
        <textarea
          rows={3}
          placeholder="Full address including postcode&#10;e.g., 123 High Street, London SW1A 1AA, United Kingdom"
          value={locationAddress}
          onChange={(e) => onLocationAddressChange(e.target.value)}
          className={cn(
            'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical',
            {
              'border-red-500 focus-visible:ring-red-500': errors.locationAddress,
            }
          )}
        />
        {errors.locationAddress && (
          <span className="text-xs text-red-500">{errors.locationAddress}</span>
        )}
        <p className="text-xs text-muted-foreground">
          Include full address with postcode for accurate directions
        </p>
      </div>
    )}
  </div>
);

// =============================================================================
// Main Date & Location Step Component
// =============================================================================

export const DateLocationStep: React.FC = () => {
  const { formData, updateFormData, errors } = useFormWizardContext();

  // Get current step errors
  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  const handleStartDateChange = (startDate: Date) => {
    updateFormData({ 
      startDate,
      // If end date is before new start date, reset it
      ...(formData.endDate && formData.endDate < startDate && { endDate: undefined })
    });
  };

  const handleEndDateChange = (endDate: Date) => {
    updateFormData({ endDate });
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFormData({ timezone: e.target.value });
  };

  const handleLocationTypeChange = (isOnline: boolean) => {
    updateFormData({
      location: {
        ...formData.location,
        isOnline,
        // Clear fields that don't apply to the new type
        ...(isOnline ? { address: '' } : { meetingLink: undefined }),
      },
    });
  };

  const handleLocationNameChange = (name: string) => {
    updateFormData({
      location: { ...formData.location, name },
    });
  };

  const handleLocationAddressChange = (address: string) => {
    updateFormData({
      location: { ...formData.location, address },
    });
  };

  const handleMeetingLinkChange = (meetingLink: string) => {
    updateFormData({
      location: { ...formData.location, meetingLink },
    });
  };

  return (
    <div className="space-y-8">
      {/* Date and Time Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Date & Time</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DateTimeInput
              label="Start Date & Time"
              value={formData.startDate}
              onChange={handleStartDateChange}
              error={getError('startDate')}
              required
              minDate={new Date()}
            />
            
            <DateTimeInput
              label="End Date & Time"
              value={formData.endDate || formData.startDate}
              onChange={handleEndDateChange}
              error={getError('endDate')}
              minDate={formData.startDate}
            />
          </div>

          {/* Timezone Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Timezone *
            </label>
            <select
              value={formData.timezone}
              onChange={handleTimezoneChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              This will be displayed to attendees in their local timezone
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Location Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Location</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <LocationTypeToggle
            isOnline={formData.location.isOnline}
            onChange={handleLocationTypeChange}
          />

          <LocationDetails
            isOnline={formData.location.isOnline}
            locationName={formData.location.name}
            locationAddress={formData.location.address}
            meetingLink={formData.location.meetingLink}
            onLocationNameChange={handleLocationNameChange}
            onLocationAddressChange={handleLocationAddressChange}
            onMeetingLinkChange={handleMeetingLinkChange}
            errors={{
              locationName: getError('location.name'),
              locationAddress: getError('location.address'),
              meetingLink: getError('location.meetingLink'),
            }}
          />
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            📅 Scheduling Tips
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Consider your target audience's availability (evenings, weekends)</li>
            <li>• Allow enough time for the event content and networking</li>
            <li>• Check for conflicts with major holidays or community events</li>
            <li>• For online events, test your platform beforehand</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};