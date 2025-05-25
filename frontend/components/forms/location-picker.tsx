import * as React from 'react';
import { MapPin, Globe, Search, Navigation, ExternalLink, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// =============================================================================
// Location Types
// =============================================================================

export interface LocationData {
  name: string;
  address: string;
  isOnline: boolean;
  meetingLink?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  timezone?: string;
  capacity?: number;
  accessibilityInfo?: string;
}

// =============================================================================
// Predefined Venue Options
// =============================================================================

const POPULAR_VENUES = [
  {
    id: 'uis-center',
    name: 'UIS Community Center',
    address: '123 High Street, London SW1A 1AA, United Kingdom',
    capacity: 100,
    type: 'community-center',
  },
  {
    id: 'royal-festival',
    name: 'Royal Festival Hall',
    address: 'Southbank Centre, Belvedere Rd, London SE1 8XX, United Kingdom',
    capacity: 300,
    type: 'venue',
  },
  {
    id: 'italian-cultural',
    name: 'Italian Cultural Institute',
    address: '39 Belgrave Square, London SW1X 8NX, United Kingdom',
    capacity: 80,
    type: 'cultural-center',
  },
  {
    id: 'barbican',
    name: 'Barbican Centre',
    address: 'Silk Street, London EC2Y 8DS, United Kingdom',
    capacity: 200,
    type: 'venue',
  },
];

const ONLINE_PLATFORMS = [
  { id: 'zoom', name: 'Zoom', urlPattern: 'https://zoom.us/j/' },
  { id: 'teams', name: 'Microsoft Teams', urlPattern: 'https://teams.microsoft.com/' },
  { id: 'meet', name: 'Google Meet', urlPattern: 'https://meet.google.com/' },
  { id: 'webex', name: 'Cisco Webex', urlPattern: 'https://webex.com/' },
  { id: 'other', name: 'Other Platform', urlPattern: '' },
];

// =============================================================================
// Location Type Selector Component
// =============================================================================

interface LocationTypeSelectorProps {
  value: 'in-person' | 'online' | 'hybrid';
  onChange: (value: 'in-person' | 'online' | 'hybrid') => void;
}

const LocationTypeSelector: React.FC<LocationTypeSelectorProps> = ({ value, onChange }) => (
  <div className="space-y-3">
    <Label className="text-sm font-medium">Event Format *</Label>
    <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-3 gap-4">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="in-person" id="in-person" />
        <Label htmlFor="in-person" className="flex items-center space-x-2 cursor-pointer">
          <MapPin className="w-4 h-4" />
          <span>In-Person</span>
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="online" id="online" />
        <Label htmlFor="online" className="flex items-center space-x-2 cursor-pointer">
          <Globe className="w-4 h-4" />
          <span>Online</span>
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="hybrid" id="hybrid" />
        <Label htmlFor="hybrid" className="flex items-center space-x-2 cursor-pointer">
          <div className="flex">
            <MapPin className="w-3 h-3" />
            <Globe className="w-3 h-3 -ml-1" />
          </div>
          <span>Hybrid</span>
        </Label>
      </div>
    </RadioGroup>
  </div>
);

// =============================================================================
// Popular Venues Selector Component
// =============================================================================

interface PopularVenuesSelectorProps {
  onVenueSelect: (venue: typeof POPULAR_VENUES[0]) => void;
}

const PopularVenuesSelector: React.FC<PopularVenuesSelectorProps> = ({ onVenueSelect }) => (
  <div className="space-y-3">
    <Label className="text-sm font-medium">Popular UIS Venues</Label>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {POPULAR_VENUES.map((venue) => (
        <Card
          key={venue.id}
          className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
          onClick={() => onVenueSelect(venue)}
        >
          <CardContent className="p-3">
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{venue.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{venue.address}</p>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Capacity: {venue.capacity}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// =============================================================================
// Physical Location Form Component
// =============================================================================

interface PhysicalLocationFormProps {
  locationData: LocationData;
  onChange: (data: Partial<LocationData>) => void;
  errors?: {
    name?: string;
    address?: string;
  };
}

const PhysicalLocationForm: React.FC<PhysicalLocationFormProps> = ({
  locationData,
  onChange,
  errors,
}) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="venue-name">Venue Name *</Label>
      <Input
        id="venue-name"
        placeholder="e.g., UIS Community Center, Royal Festival Hall"
        value={locationData.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className={cn(errors?.name && 'border-red-500')}
      />
      {errors?.name && <span className="text-xs text-red-500">{errors.name}</span>}
    </div>

    <div className="space-y-2">
      <Label htmlFor="venue-address">Full Address *</Label>
      <Textarea
        id="venue-address"
        placeholder="Include street address, city, postcode, and country&#10;e.g., 123 High Street, London SW1A 1AA, United Kingdom"
        value={locationData.address}
        onChange={(e) => onChange({ address: e.target.value })}
        className={cn('resize-none', errors?.address && 'border-red-500')}
        rows={3}
      />
      {errors?.address && <span className="text-xs text-red-500">{errors.address}</span>}
      <p className="text-xs text-muted-foreground">
        A complete address helps attendees find the venue easily
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="capacity">Venue Capacity (Optional)</Label>
        <Input
          id="capacity"
          type="number"
          placeholder="100"
          value={locationData.capacity || ''}
          onChange={(e) => onChange({ capacity: e.target.value ? parseInt(e.target.value) : undefined })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select value={locationData.timezone || 'Europe/London'} onValueChange={(value) => onChange({ timezone: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
            <SelectItem value="Europe/Rome">Rome (CET/CEST)</SelectItem>
            <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
            <SelectItem value="Europe/Berlin">Berlin (CET/CEST)</SelectItem>
            <SelectItem value="America/New_York">New York (EST/EDT)</SelectItem>
            <SelectItem value="America/Los_Angeles">Los Angeles (PST/PDT)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="accessibility">Accessibility Information (Optional)</Label>
      <Textarea
        id="accessibility"
        placeholder="e.g., Wheelchair accessible, Step-free access, Hearing loop available"
        value={locationData.accessibilityInfo || ''}
        onChange={(e) => onChange({ accessibilityInfo: e.target.value })}
        className="resize-none"
        rows={2}
      />
      <p className="text-xs text-muted-foreground">
        Help attendees understand what accessibility features are available
      </p>
    </div>
  </div>
);

// =============================================================================
// Online Location Form Component
// =============================================================================

interface OnlineLocationFormProps {
  locationData: LocationData;
  onChange: (data: Partial<LocationData>) => void;
  errors?: {
    name?: string;
    meetingLink?: string;
  };
}

const OnlineLocationForm: React.FC<OnlineLocationFormProps> = ({
  locationData,
  onChange,
  errors,
}) => {
  const [selectedPlatform, setSelectedPlatform] = React.useState<string>('');

  const handlePlatformSelect = (platformId: string) => {
    const platform = ONLINE_PLATFORMS.find(p => p.id === platformId);
    if (platform) {
      setSelectedPlatform(platformId);
      onChange({ name: platform.name });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label>Platform *</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ONLINE_PLATFORMS.map((platform) => (
            <Card
              key={platform.id}
              className={cn(
                'cursor-pointer transition-all',
                selectedPlatform === platform.id
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:ring-1 hover:ring-gray-300'
              )}
              onClick={() => handlePlatformSelect(platform.id)}
            >
              <CardContent className="p-3 text-center">
                <Globe className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{platform.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="platform-name">Platform/Event Name *</Label>
        <Input
          id="platform-name"
          placeholder="e.g., Zoom Meeting, Italian Language Workshop"
          value={locationData.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={cn(errors?.name && 'border-red-500')}
        />
        {errors?.name && <span className="text-xs text-red-500">{errors.name}</span>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="meeting-link">Meeting Link *</Label>
        <div className="relative">
          <Input
            id="meeting-link"
            type="url"
            placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-def-ghi"
            value={locationData.meetingLink || ''}
            onChange={(e) => onChange({ meetingLink: e.target.value })}
            className={cn('pr-10', errors?.meetingLink && 'border-red-500')}
          />
          <ExternalLink className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
        {errors?.meetingLink && <span className="text-xs text-red-500">{errors.meetingLink}</span>}
        <p className="text-xs text-muted-foreground">
          This link will be shared with registered participants before the event
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <div className="flex items-start space-x-2">
          <Navigation className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Online Event Tips</p>
            <ul className="text-xs space-y-1">
              <li>• Test your meeting link before the event</li>
              <li>• Consider enabling a waiting room for security</li>
              <li>• Prepare backup communication methods</li>
              <li>• Share technical requirements with attendees</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Main Location Picker Component
// =============================================================================

interface LocationPickerProps {
  value: LocationData;
  onChange: (location: LocationData) => void;
  errors?: {
    name?: string;
    address?: string;
    meetingLink?: string;
  };
  className?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  errors,
  className,
}) => {
  const [locationType, setLocationType] = React.useState<'in-person' | 'online' | 'hybrid'>(
    value.isOnline ? 'online' : 'in-person'
  );

  const handleLocationTypeChange = (type: 'in-person' | 'online' | 'hybrid') => {
    setLocationType(type);
    const isOnline = type === 'online' || type === 'hybrid';
    
    onChange({
      ...value,
      isOnline,
      // Clear irrelevant fields when switching types
      ...(isOnline ? { address: '', capacity: undefined, accessibilityInfo: undefined } : { meetingLink: undefined }),
    });
  };

  const handleVenueSelect = (venue: typeof POPULAR_VENUES[0]) => {
    onChange({
      ...value,
      name: venue.name,
      address: venue.address,
      capacity: venue.capacity,
      isOnline: false,
    });
    setLocationType('in-person');
  };

  const handleLocationDataChange = (updates: Partial<LocationData>) => {
    onChange({ ...value, ...updates });
  };

  return (
    <div className={cn('space-y-6', className)}>
      <LocationTypeSelector value={locationType} onChange={handleLocationTypeChange} />

      {locationType === 'in-person' && (
        <div className="space-y-6">
          <PopularVenuesSelector onVenueSelect={handleVenueSelect} />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or enter custom venue</span>
            </div>
          </div>
          <PhysicalLocationForm
            locationData={value}
            onChange={handleLocationDataChange}
            errors={errors}
          />
        </div>
      )}

      {locationType === 'online' && (
        <OnlineLocationForm
          locationData={value}
          onChange={handleLocationDataChange}
          errors={errors}
        />
      )}

      {locationType === 'hybrid' && (
        <div className="space-y-6">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <div className="flex">
                  <MapPin className="w-4 h-4" />
                  <Globe className="w-4 h-4 -ml-2" />
                </div>
                <span>Hybrid Event Setup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-yellow-800">
              <p>Configure both physical venue and online access for maximum reach.</p>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>Physical Venue</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PhysicalLocationForm
                  locationData={value}
                  onChange={handleLocationDataChange}
                  errors={errors}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Globe className="w-4 h-4" />
                  <span>Online Access</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OnlineLocationForm
                  locationData={value}
                  onChange={handleLocationDataChange}
                  errors={errors}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};