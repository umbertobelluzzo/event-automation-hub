"use client";

import React from 'react';
import { Users, Mic, Network, Palette, GraduationCap, Heart } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFormWizardContext } from '@/hooks/use-form-wizard-context';
import { EventType } from '@/shared/types';

// =============================================================================
// Event Type Options
// =============================================================================

const EVENT_TYPE_OPTIONS: Array<{
  type: EventType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    type: 'community',
    label: 'Community Event',
    description: 'Social gatherings, meetups, and community activities',
    icon: Users,
    color: 'bg-blue-500',
  },
  {
    type: 'speaker',
    label: 'Speaker Event',
    description: 'Presentations, talks, and guest speaker sessions',
    icon: Mic,
    color: 'bg-purple-500',
  },
  {
    type: 'networking',
    label: 'Networking',
    description: 'Professional networking and business connections',
    icon: Network,
    color: 'bg-green-500',
  },
  {
    type: 'cultural',
    label: 'Cultural Event',
    description: 'Art, music, cinema, and cultural celebrations',
    icon: Palette,
    color: 'bg-pink-500',
  },
  {
    type: 'educational',
    label: 'Educational',
    description: 'Workshops, classes, and learning experiences',
    icon: GraduationCap,
    color: 'bg-orange-500',
  },
  {
    type: 'social',
    label: 'Social Event',
    description: 'Parties, celebrations, and social activities',
    icon: Heart,
    color: 'bg-red-500',
  },
];

// =============================================================================
// Event Type Selector Component
// =============================================================================

interface EventTypeSelectorProps {
  selectedType: EventType;
  onTypeChange: (type: EventType) => void;
}

const EventTypeSelector: React.FC<EventTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
}) => (
  <div className="space-y-4">
    <div>
      <label className="text-sm font-medium text-gray-900 mb-3 block">
        What type of event are you organizing? *
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {EVENT_TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.type;
          
          return (
            <Card
              key={option.type}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md',
                {
                  'ring-2 ring-primary shadow-md': isSelected,
                  'hover:ring-1 hover:ring-gray-300': !isSelected,
                }
              )}
              onClick={() => onTypeChange(option.type)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={cn('p-2 rounded-md text-white', option.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      {option.label}
                    </h3>
                    <p className="text-xs text-gray-600 leading-tight">
                      {option.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  </div>
);

// =============================================================================
// Character Counter Component
// =============================================================================

interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

const CharacterCounter: React.FC<CharacterCounterProps> = ({
  current,
  max,
  className,
}) => (
  <div className={cn('text-xs text-muted-foreground text-right', className)}>
    {current}/{max} characters
    {current > max && (
      <span className="text-red-500 ml-1">
        ({current - max} over limit)
      </span>
    )}
  </div>
);

// =============================================================================
// Main Event Basics Step Component
// =============================================================================

export const EventBasicsStep: React.FC = () => {
  const { formData, updateFormData, errors } = useFormWizardContext();

  const handleTypeChange = (eventType: EventType) => {
    updateFormData({ eventType });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ title: e.target.value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateFormData({ description: e.target.value });
  };

  // Get current step errors
  const titleError = errors.find(e => e.field === 'title')?.message;
  const descriptionError = errors.find(e => e.field === 'description')?.message;

  return (
    <div className="space-y-8">
      {/* Event Type Selection */}
      <EventTypeSelector
        selectedType={formData.eventType}
        onTypeChange={handleTypeChange}
      />

      {/* Event Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium text-gray-900">
          Event Title *
        </label>
        <Input
          id="title"
          type="text"
          placeholder="e.g., Italian Language Workshop for Beginners"
          value={formData.title}
          onChange={handleTitleChange}
          className={cn({
            'border-red-500 focus-visible:ring-red-500': titleError,
          })}
          maxLength={100}
        />
        <div className="flex justify-between items-center">
          {titleError && (
            <span className="text-xs text-red-500">{titleError}</span>
          )}
          <CharacterCounter
            current={formData.title.length}
            max={100}
            className="ml-auto"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Choose a clear, descriptive title that will attract your target audience
        </p>
      </div>

      {/* Event Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium text-gray-900">
          Event Description *
        </label>
        <textarea
          id="description"
          rows={4}
          placeholder="Describe your event in detail. What will participants learn or experience? Who should attend? Include any special requirements or highlights..."
          value={formData.description}
          onChange={handleDescriptionChange}
          className={cn(
            'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical min-h-24',
            {
              'border-red-500 focus-visible:ring-red-500': descriptionError,
            }
          )}
          maxLength={1000}
        />
        <div className="flex justify-between items-center">
          {descriptionError && (
            <span className="text-xs text-red-500">{descriptionError}</span>
          )}
          <CharacterCounter
            current={formData.description.length}
            max={1000}
            className="ml-auto"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          This description will be used to generate your promotional materials. 
          Be specific and engaging!
        </p>
      </div>

      {/* Tips Section */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-yellow-900 mb-2">
            💡 Tips for a Great Event Description
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Include who should attend (beginners, professionals, families, etc.)</li>
            <li>• Mention what participants will gain or learn</li>
            <li>• Highlight any special guests, activities, or unique features</li>
            <li>• Keep it engaging and easy to understand</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};