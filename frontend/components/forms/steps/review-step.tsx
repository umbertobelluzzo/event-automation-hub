"use client";

import React from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  PoundSterling, 
  Palette, 
  MessageSquare,
  Globe,
  Ticket,
  Edit,
  CheckCircle,
  Info
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { useFormWizardContext } from '@/hooks/use-form-wizard-context';

// =============================================================================
// Review Section Component
// =============================================================================

interface ReviewSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  onEdit: () => void;
  children: React.ReactNode;
  stepNumber: number;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({
  title,
  icon: Icon,
  onEdit,
  children,
  stepNumber,
}) => (
  <Card>
    <CardHeader className="pb-4">
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Icon className="w-5 h-5" />
          <span>{title}</span>
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="flex items-center space-x-1"
        >
          <Edit className="w-3 h-3" />
          <span>Edit</span>
        </Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {children}
    </CardContent>
  </Card>
);

// =============================================================================
// Detail Row Component
// =============================================================================

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon: Icon }) => (
  <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-b-0">
    <div className="flex items-center space-x-2">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      <span className="text-sm font-medium text-gray-600">{label}:</span>
    </div>
    <div className="text-sm text-gray-900 text-right max-w-xs">{value}</div>
  </div>
);

// =============================================================================
// Event Basics Review Component
// =============================================================================

interface EventBasicsReviewProps {
  formData: any;
  onEdit: () => void;
}

const EventBasicsReview: React.FC<EventBasicsReviewProps> = ({ formData, onEdit }) => (
  <ReviewSection
    title="Event Basics"
    icon={Info}
    onEdit={onEdit}
    stepNumber={0}
  >
    <DetailRow 
      label="Event Type" 
      value={
        <span className="capitalize bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
          {formData.eventType.replace('-', ' ')}
        </span>
      } 
    />
    <DetailRow label="Title" value={formData.title} />
    <DetailRow 
      label="Description" 
      value={
        <div className="max-w-xs">
          <p className="line-clamp-3">{formData.description}</p>
          {formData.description.length > 100 && (
            <span className="text-xs text-muted-foreground">
              ({formData.description.length} characters)
            </span>
          )}
        </div>
      } 
    />
  </ReviewSection>
);

// =============================================================================
// Date & Location Review Component
// =============================================================================

interface DateLocationReviewProps {
  formData: any;
  onEdit: () => void;
}

const DateLocationReview: React.FC<DateLocationReviewProps> = ({ formData, onEdit }) => (
  <ReviewSection
    title="Date & Location"
    icon={Calendar}
    onEdit={onEdit}
    stepNumber={1}
  >
    <DetailRow 
      icon={Calendar}
      label="Start Date" 
      value={formatDate(formData.startDate)} 
    />
    {formData.endDate && (
      <DetailRow 
        icon={Clock}
        label="End Date" 
        value={formatDate(formData.endDate)} 
      />
    )}
    <DetailRow 
      label="Timezone" 
      value={formData.timezone} 
    />
    <DetailRow 
      icon={formData.location.isOnline ? Globe : MapPin}
      label="Format" 
      value={
        <span className={cn(
          'px-2 py-1 rounded text-xs font-medium',
          formData.location.isOnline 
            ? 'bg-green-100 text-green-800' 
            : 'bg-blue-100 text-blue-800'
        )}>
          {formData.location.isOnline ? 'Online Event' : 'In-Person Event'}
        </span>
      } 
    />
    <DetailRow 
      label={formData.location.isOnline ? "Platform" : "Venue"} 
      value={formData.location.name} 
    />
    {formData.location.isOnline ? (
      formData.location.meetingLink && (
        <DetailRow 
          label="Meeting Link" 
          value={
            <a 
              href={formData.location.meetingLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline break-all"
            >
              {formData.location.meetingLink}
            </a>
          } 
        />
      )
    ) : (
      <DetailRow 
        label="Address" 
        value={
          <div className="text-right">
            {formData.location.address.split('\n').map((line: string, index: number) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        } 
      />
    )}
  </ReviewSection>
);

// =============================================================================
// Tickets Review Component
// =============================================================================

interface TicketsReviewProps {
  formData: any;
  onEdit: () => void;
}

const TicketsReview: React.FC<TicketsReviewProps> = ({ formData, onEdit }) => {
  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = { GBP: '£', EUR: '€', USD: '$' };
    return symbols[currency] || currency;
  };

  return (
    <ReviewSection
      title="Tickets & Registration"
      icon={Ticket}
      onEdit={onEdit}
      stepNumber={2}
    >
      <DetailRow 
        icon={PoundSterling}
        label="Price" 
        value={
          <span className={cn(
            'px-2 py-1 rounded text-xs font-medium',
            formData.ticketInfo.isFree 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          )}>
            {formData.ticketInfo.isFree 
              ? 'Free Event' 
              : `${getCurrencySymbol(formData.ticketInfo.currency)}${formData.ticketInfo.price?.toFixed(2) || '0.00'}`}
          </span>
        } 
      />
      <DetailRow 
        icon={Users}
        label="Capacity" 
        value={formData.ticketInfo.maxAttendees || 'Unlimited'} 
      />
      <DetailRow 
        label="Registration" 
        value={
          <span className={cn(
            'px-2 py-1 rounded text-xs font-medium',
            formData.ticketInfo.registrationRequired 
              ? 'bg-orange-100 text-orange-800' 
              : 'bg-gray-100 text-gray-800'
          )}>
            {formData.ticketInfo.registrationRequired ? 'Required' : 'Optional'}
          </span>
        } 
      />
      {formData.ticketInfo.registrationDeadline && (
        <DetailRow 
          icon={Calendar}
          label="Registration Deadline" 
          value={formatDate(formData.ticketInfo.registrationDeadline)} 
        />
      )}
    </ReviewSection>
  );
};

// =============================================================================
// Content Preferences Review Component
// =============================================================================

interface ContentPreferencesReviewProps {
  formData: any;
  onEdit: () => void;
}

const ContentPreferencesReview: React.FC<ContentPreferencesReviewProps> = ({ formData, onEdit }) => (
  <ReviewSection
    title="AI Content Preferences"
    icon={Palette}
    onEdit={onEdit}
    stepNumber={3}
  >
    <DetailRow 
      icon={Palette}
      label="Flyer Style" 
      value={
        <span className="capitalize bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
          {formData.contentPreferences.flyerStyle}
        </span>
      } 
    />
    <DetailRow 
      icon={MessageSquare}
      label="Social Tone" 
      value={
        <span className="capitalize bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
          {formData.contentPreferences.socialTone}
        </span>
      } 
    />
    <DetailRow 
      icon={Users}
      label="Target Audience" 
      value={
        <div className="space-y-1">
          {formData.contentPreferences.targetAudience.slice(0, 3).map((audience: string, index: number) => (
            <div key={index} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
              {audience.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </div>
          ))}
          {formData.contentPreferences.targetAudience.length > 3 && (
            <div className="text-xs text-muted-foreground">
              +{formData.contentPreferences.targetAudience.length - 3} more
            </div>
          )}
        </div>
      } 
    />
    <DetailRow 
      label="Key Messages" 
      value={
        <div className="space-y-1">
          {formData.contentPreferences.keyMessages.slice(0, 2).map((message: string, index: number) => (
            <div key={index} className="bg-yellow-50 text-yellow-800 px-2 py-1 rounded text-xs">
              {message}
            </div>
          ))}
          {formData.contentPreferences.keyMessages.length > 2 && (
            <div className="text-xs text-muted-foreground">
              +{formData.contentPreferences.keyMessages.length - 2} more messages
            </div>
          )}
        </div>
      } 
    />
    <DetailRow 
      label="Include Logo" 
      value={
        <span className={cn(
          'px-2 py-1 rounded text-xs font-medium',
          formData.contentPreferences.includeLogo 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        )}>
          {formData.contentPreferences.includeLogo ? 'Yes' : 'No'}
        </span>
      } 
    />
  </ReviewSection>
);

// =============================================================================
// Final Summary Component
// =============================================================================

interface FinalSummaryProps {
  formData: any;
}

const FinalSummary: React.FC<FinalSummaryProps> = ({ formData }) => (
  <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
    <CardHeader>
      <CardTitle className="flex items-center space-x-2 text-green-900">
        <CheckCircle className="w-5 h-5" />
        <span>Ready to Create Your Event</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-medium text-green-900">What happens next:</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3" />
              <span>Event created in database</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3" />
              <span>AI generates promotional flyer</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3" />
              <span>Social media posts created</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3" />
              <span>WhatsApp message prepared</span>
            </li>
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="font-medium text-green-900">You'll be able to:</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3" />
              <span>Review all generated content</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3" />
              <span>Edit or regenerate materials</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3" />
              <span>Publish when ready</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3" />
              <span>Access all assets in Google Drive</span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="bg-white/50 rounded-md p-3 mt-4">
        <p className="text-sm text-green-700">
          <strong>Estimated time:</strong> Your promotional materials will be ready for review in 2-3 minutes.
        </p>
      </div>
    </CardContent>
  </Card>
);

// =============================================================================
// Main Review Step Component
// =============================================================================

export const ReviewStep: React.FC = () => {
  const { formData, goToStep } = useFormWizardContext();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Review Your Event</h2>
        <p className="text-gray-600">
          Please review all the details below. You can edit any section before creating your event.
        </p>
      </div>

      {/* Review Sections */}
      <div className="space-y-6">
        <EventBasicsReview 
          formData={formData} 
          onEdit={() => goToStep(0)} 
        />
        
        <DateLocationReview 
          formData={formData} 
          onEdit={() => goToStep(1)} 
        />
        
        <TicketsReview 
          formData={formData} 
          onEdit={() => goToStep(2)} 
        />
        
        <ContentPreferencesReview 
          formData={formData} 
          onEdit={() => goToStep(3)} 
        />
      </div>

      {/* Final Summary */}
      <FinalSummary formData={formData} />

      {/* Terms and Conditions */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="terms"
                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2 mt-0.5"
                required
              />
              <label htmlFor="terms" className="text-sm text-gray-700">
                I confirm that all the information provided is accurate and I have the authority to create this event on behalf of United Italian Societies.
              </label>
            </div>
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="ai-consent"
                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2 mt-0.5"
                required
              />
              <label htmlFor="ai-consent" className="text-sm text-gray-700">
                I consent to using AI to generate promotional materials for this event and understand that I can review and edit all generated content before publishing.
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {formData.contentPreferences.targetAudience.length}
          </div>
          <div className="text-xs text-blue-800">Target Audiences</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">
            {formData.contentPreferences.keyMessages.length}
          </div>
          <div className="text-xs text-green-800">Key Messages</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {formData.ticketInfo.isFree ? 'FREE' : formatCurrency(formData.ticketInfo.price || 0, formData.ticketInfo.currency)}
          </div>
          <div className="text-xs text-purple-800">Event Price</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {formData.ticketInfo.maxAttendees || '∞'}
          </div>
          <div className="text-xs text-orange-800">Max Attendees</div>
        </div>
      </div>

      {/* Tips for Success */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-yellow-900 mb-2">
            💡 Tips for Success
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Double-check your date and location details</li>
            <li>• Ensure your contact information is current</li>
            <li>• Review the AI-generated content before publishing</li>
            <li>• Share your event link with the UIS community</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};