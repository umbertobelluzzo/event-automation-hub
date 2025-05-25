import React, { useState } from 'react';
import { Palette, Users, MessageSquare, Sparkles, Plus, X, Image } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFormWizardContext } from '@/hooks/use-form-wizard-context';

// =============================================================================
// Flyer Style Options
// =============================================================================

const FLYER_STYLE_OPTIONS = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Clean, corporate look with elegant typography',
    preview: 'bg-gradient-to-br from-blue-600 to-blue-800',
    textColor: 'text-white',
  },
  {
    value: 'casual',
    label: 'Casual',
    description: 'Friendly and approachable with warm colors',
    preview: 'bg-gradient-to-br from-orange-400 to-orange-600',
    textColor: 'text-white',
  },
  {
    value: 'festive',
    label: 'Festive',
    description: 'Vibrant and celebratory with bold elements',
    preview: 'bg-gradient-to-br from-pink-500 to-purple-600',
    textColor: 'text-white',
  },
  {
    value: 'artistic',
    label: 'Artistic',
    description: 'Creative and unique with artistic flair',
    preview: 'bg-gradient-to-br from-green-500 to-teal-600',
    textColor: 'text-white',
  },
] as const;

// =============================================================================
// Target Audience Options
// =============================================================================

const TARGET_AUDIENCE_OPTIONS = [
  { value: 'young-professionals', label: 'Young Professionals (25-35)' },
  { value: 'families', label: 'Families with Children' },
  { value: 'seniors', label: 'Seniors (55+)' },
  { value: 'students', label: 'Students & Recent Graduates' },
  { value: 'italian-speakers', label: 'Italian Speakers' },
  { value: 'language-learners', label: 'Language Learners' },
  { value: 'business-owners', label: 'Business Owners' },
  { value: 'cultural-enthusiasts', label: 'Cultural Enthusiasts' },
  { value: 'food-lovers', label: 'Food & Wine Lovers' },
  { value: 'art-music-fans', label: 'Art & Music Fans' },
  { value: 'travel-enthusiasts', label: 'Travel Enthusiasts' },
  { value: 'general-public', label: 'General Public' },
];

// =============================================================================
// Social Tone Options
// =============================================================================

const SOCIAL_TONE_OPTIONS = [
  {
    value: 'formal',
    label: 'Formal',
    description: 'Professional and respectful tone',
    example: 'We cordially invite you to join our distinguished event...',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    description: 'Warm and welcoming approach',
    example: 'Come join us for an amazing evening of...',
  },
  {
    value: 'enthusiastic',
    label: 'Enthusiastic',
    description: 'Energetic and exciting language',
    example: 'Get ready for an incredible experience that you won\'t want to miss!',
  },
] as const;

// =============================================================================
// Flyer Style Selector Component
// =============================================================================

interface FlyerStyleSelectorProps {
  selectedStyle: string;
  onStyleChange: (style: string) => void;
}

const FlyerStyleSelector: React.FC<FlyerStyleSelectorProps> = ({
  selectedStyle,
  onStyleChange,
}) => (
  <div className="space-y-4">
    <div>
      <label className="text-sm font-medium text-gray-900 mb-3 block">
        Flyer Style *
      </label>
      <p className="text-xs text-muted-foreground mb-4">
        Choose the visual style for your AI-generated flyer
      </p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {FLYER_STYLE_OPTIONS.map((style) => (
        <Card
          key={style.value}
          className={cn(
            'cursor-pointer transition-all duration-200 hover:shadow-md',
            {
              'ring-2 ring-primary shadow-md': selectedStyle === style.value,
              'hover:ring-1 hover:ring-gray-300': selectedStyle !== style.value,
            }
          )}
          onClick={() => onStyleChange(style.value)}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              {/* Style Preview */}
              <div className={cn(
                'w-16 h-12 rounded-md flex items-center justify-center',
                style.preview
              )}>
                <div className="flex items-center space-x-1">
                  <Image className={cn('w-3 h-3', style.textColor)} />
                  <Palette className={cn('w-3 h-3', style.textColor)} />
                </div>
              </div>
              
              {/* Style Info */}
              <div className="flex-1">
                <h3 className="font-medium text-sm mb-1">{style.label}</h3>
                <p className="text-xs text-muted-foreground">{style.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// =============================================================================
// Target Audience Selector Component
// =============================================================================

interface TargetAudienceSelectorProps {
  selectedAudiences: string[];
  onAudienceChange: (audiences: string[]) => void;
  error?: string;
}

const TargetAudienceSelector: React.FC<TargetAudienceSelectorProps> = ({
  selectedAudiences,
  onAudienceChange,
  error,
}) => {
  const toggleAudience = (audience: string) => {
    if (selectedAudiences.includes(audience)) {
      onAudienceChange(selectedAudiences.filter(a => a !== audience));
    } else {
      onAudienceChange([...selectedAudiences, audience]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-900">
          Target Audience *
        </label>
        <p className="text-xs text-muted-foreground mt-1">
          Select all groups that apply to help AI create more targeted content
        </p>
        {error && (
          <span className="text-xs text-red-500 mt-1 block">{error}</span>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {TARGET_AUDIENCE_OPTIONS.map((audience) => {
          const isSelected = selectedAudiences.includes(audience.value);
          
          return (
            <Button
              key={audience.value}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleAudience(audience.value)}
              className="justify-start text-left h-auto py-2 px-3"
            >
              <span className="text-xs">{audience.label}</span>
            </Button>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Selected: {selectedAudiences.length} audience{selectedAudiences.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
};

// =============================================================================
// Key Messages Component
// =============================================================================

interface KeyMessagesProps {
  messages: string[];
  onMessagesChange: (messages: string[]) => void;
  error?: string;
}

const KeyMessages: React.FC<KeyMessagesProps> = ({
  messages,
  onMessagesChange,
  error,
}) => {
  const [newMessage, setNewMessage] = useState('');

  const addMessage = () => {
    if (newMessage.trim() && !messages.includes(newMessage.trim())) {
      onMessagesChange([...messages, newMessage.trim()]);
      setNewMessage('');
    }
  };

  const removeMessage = (index: number) => {
    onMessagesChange(messages.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addMessage();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-900">
          Key Messages *
        </label>
        <p className="text-xs text-muted-foreground mt-1">
          Add important points to highlight in your promotional content
        </p>
        {error && (
          <span className="text-xs text-red-500 mt-1 block">{error}</span>
        )}
      </div>

      {/* Add New Message */}
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="e.g., Perfect for beginners, Free refreshments included"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          maxLength={80}
        />
        <Button
          type="button"
          onClick={addMessage}
          disabled={!newMessage.trim() || messages.includes(newMessage.trim())}
          size="sm"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Current Messages */}
      {messages.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Current Messages:</h4>
          <div className="space-y-2">
            {messages.map((message, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2"
              >
                <span className="text-sm flex-1">{message}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMessage(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Added: {messages.length} message{messages.length !== 1 ? 's' : ''} 
        {messages.length > 0 && ` • ${messages.reduce((acc, msg) => acc + msg.length, 0)} characters total`}
      </p>
    </div>
  );
};

// =============================================================================
// Social Tone Selector Component
// =============================================================================

interface SocialToneSelectorProps {
  selectedTone: string;
  onToneChange: (tone: string) => void;
}

const SocialToneSelector: React.FC<SocialToneSelectorProps> = ({
  selectedTone,
  onToneChange,
}) => (
  <div className="space-y-4">
    <div>
      <label className="text-sm font-medium text-gray-900">
        Social Media Tone *
      </label>
      <p className="text-xs text-muted-foreground mt-1">
        Choose the writing style for social media posts
      </p>
    </div>
    
    <div className="space-y-3">
      {SOCIAL_TONE_OPTIONS.map((tone) => (
        <Card
          key={tone.value}
          className={cn(
            'cursor-pointer transition-all duration-200',
            {
              'ring-2 ring-primary shadow-md bg-primary/5': selectedTone === tone.value,
              'hover:ring-1 hover:ring-gray-300': selectedTone !== tone.value,
            }
          )}
          onClick={() => onToneChange(tone.value)}
        >
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-sm">{tone.label}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{tone.description}</p>
              <div className="bg-gray-50 rounded-md p-2 mt-2">
                <p className="text-xs italic text-gray-600">"{tone.example}"</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// =============================================================================
// Main Content Preferences Step Component
// =============================================================================

export const ContentPreferencesStep: React.FC = () => {
  const { formData, updateFormData, errors } = useFormWizardContext();

  // Get current step errors
  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  const handleStyleChange = (flyerStyle: string) => {
    updateFormData({
      contentPreferences: {
        ...formData.contentPreferences,
        flyerStyle: flyerStyle as any,
      },
    });
  };

  const handleAudienceChange = (targetAudience: string[]) => {
    updateFormData({
      contentPreferences: {
        ...formData.contentPreferences,
        targetAudience,
      },
    });
  };

  const handleMessagesChange = (keyMessages: string[]) => {
    updateFormData({
      contentPreferences: {
        ...formData.contentPreferences,
        keyMessages,
      },
    });
  };

  const handleToneChange = (socialTone: string) => {
    updateFormData({
      contentPreferences: {
        ...formData.contentPreferences,
        socialTone: socialTone as any,
      },
    });
  };

  const handleLogoToggle = (includeLogo: boolean) => {
    updateFormData({
      contentPreferences: {
        ...formData.contentPreferences,
        includeLogo,
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Flyer Design Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Flyer Design</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FlyerStyleSelector
            selectedStyle={formData.contentPreferences.flyerStyle}
            onStyleChange={handleStyleChange}
          />

          {/* Include Logo Option */}
          <div className="flex items-center space-x-3 pt-4 border-t">
            <input
              type="checkbox"
              id="include-logo"
              checked={formData.contentPreferences.includeLogo}
              onChange={(e) => handleLogoToggle(e.target.checked)}
              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
            />
            <label htmlFor="include-logo" className="text-sm text-gray-700">
              Include UIS logo on the flyer
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Content Strategy Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Content Strategy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <TargetAudienceSelector
            selectedAudiences={formData.contentPreferences.targetAudience}
            onAudienceChange={handleAudienceChange}
            error={getError('contentPreferences.targetAudience')}
          />

          <KeyMessages
            messages={formData.contentPreferences.keyMessages}
            onMessagesChange={handleMessagesChange}
            error={getError('contentPreferences.keyMessages')}
          />
        </CardContent>
      </Card>

      {/* Social Media Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Social Media Style</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SocialToneSelector
            selectedTone={formData.contentPreferences.socialTone}
            onToneChange={handleToneChange}
          />
        </CardContent>
      </Card>

      {/* AI Preview Section */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-purple-900 mb-1">
                AI Content Generation Preview
              </h3>
              <p className="text-sm text-purple-700 mb-2">
                Based on your preferences, our AI will create:
              </p>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• A {formData.contentPreferences.flyerStyle} flyer design with your event details</li>
                <li>• {formData.contentPreferences.socialTone.charAt(0).toUpperCase() + formData.contentPreferences.socialTone.slice(1)} social media captions for Instagram and LinkedIn</li>
                <li>• A WhatsApp message for community broadcasting</li>
                {formData.contentPreferences.keyMessages.length > 0 && (
                  <li>• Highlighting: {formData.contentPreferences.keyMessages.slice(0, 2).join(', ')}{formData.contentPreferences.keyMessages.length > 2 ? '...' : ''}</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};