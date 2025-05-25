import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// =============================================================================
// Time Picker Component
// =============================================================================

interface TimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
}

const TimePicker: React.FC<TimePickerProps> = ({ date, setDate }) => {
  const minuteRef = React.useRef<HTMLInputElement>(null);
  const hourRef = React.useRef<HTMLInputElement>(null);
  const secondRef = React.useRef<HTMLInputElement>(null);

  const hours = date ? date.getHours().toString().padStart(2, '0') : '00';
  const minutes = date ? date.getMinutes().toString().padStart(2, '0') : '00';

  const handleTimeChange = (type: 'hour' | 'minute', value: string) => {
    if (!date) {
      const newDate = new Date();
      newDate.setHours(0, 0, 0, 0);
      setDate(newDate);
      return;
    }

    const newDate = new Date(date);
    if (type === 'hour') {
      newDate.setHours(parseInt(value) || 0);
    } else if (type === 'minute') {
      newDate.setMinutes(parseInt(value) || 0);
    }
    setDate(newDate);
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="grid gap-1 text-center">
        <Label htmlFor="hours" className="text-xs">
          Hours
        </Label>
        <Input
          id="hours"
          ref={hourRef}
          className="w-12 text-center"
          value={hours}
          onChange={(e) => handleTimeChange('hour', e.target.value)}
          onBlur={(e) => {
            const value = parseInt(e.target.value);
            if (value < 0 || value > 23) {
              handleTimeChange('hour', '00');
            }
          }}
          type="number"
          min="0"
          max="23"
        />
      </div>
      <div className="text-xl">:</div>
      <div className="grid gap-1 text-center">
        <Label htmlFor="minutes" className="text-xs">
          Minutes
        </Label>
        <Input
          id="minutes"
          ref={minuteRef}
          className="w-12 text-center"
          value={minutes}
          onChange={(e) => handleTimeChange('minute', e.target.value)}
          onBlur={(e) => {
            const value = parseInt(e.target.value);
            if (value < 0 || value > 59) {
              handleTimeChange('minute', '00');
            }
          }}
          type="number"
          min="0"
          max="59"
        />
      </div>
    </div>
  );
};

// =============================================================================
// Quick Time Buttons Component
// =============================================================================

interface QuickTimeButtonsProps {
  onTimeSelect: (hour: number, minute: number) => void;
}

const QuickTimeButtons: React.FC<QuickTimeButtonsProps> = ({ onTimeSelect }) => {
  const quickTimes = [
    { label: '9:00 AM', hour: 9, minute: 0 },
    { label: '12:00 PM', hour: 12, minute: 0 },
    { label: '2:00 PM', hour: 14, minute: 0 },
    { label: '6:00 PM', hour: 18, minute: 0 },
    { label: '7:00 PM', hour: 19, minute: 0 },
    { label: '8:00 PM', hour: 20, minute: 0 },
  ];

  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-2 block">Quick Times</Label>
      <div className="grid grid-cols-3 gap-1">
        {quickTimes.map((time) => (
          <Button
            key={time.label}
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => onTimeSelect(time.hour, time.minute)}
          >
            {time.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// Main DateTime Picker Component
// =============================================================================

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showTime?: boolean;
  required?: boolean;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  date,
  setDate,
  placeholder = 'Pick a date and time',
  className,
  disabled = false,
  minDate,
  maxDate,
  showTime = true,
  required = false,
}) => {
  const [open, setOpen] = React.useState(false);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      if (date) {
        // Preserve time if date already exists
        const newDate = new Date(selectedDate);
        newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
        setDate(newDate);
      } else {
        // Set default time to current time or 9 AM
        const newDate = new Date(selectedDate);
        const now = new Date();
        newDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
        setDate(newDate);
      }
    } else {
      setDate(undefined);
    }
  };

  const handleQuickTimeSelect = (hour: number, minute: number) => {
    if (date) {
      const newDate = new Date(date);
      newDate.setHours(hour, minute, 0, 0);
      setDate(newDate);
    }
  };

  const formatDisplayDate = (date: Date) => {
    if (showTime) {
      return format(date, 'PPP p'); // e.g., "Jan 1, 2024 at 2:00 PM"
    }
    return format(date, 'PPP'); // e.g., "Jan 1, 2024"
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDisplayDate(date) : <span>{placeholder}</span>}
          {required && !date && <span className="text-red-500 ml-1">*</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            initialFocus
          />
          
          {showTime && (
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Time</Label>
              </div>
              
              <TimePicker date={date} setDate={setDate} />
              
              <QuickTimeButtons onTimeSelect={handleQuickTimeSelect} />
            </div>
          )}
          
          <div className="flex justify-between pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDate(undefined);
                setOpen(false);
              }}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setOpen(false)}
              disabled={required && !date}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};