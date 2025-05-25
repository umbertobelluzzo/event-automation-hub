import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { type ClassValue } from 'clsx';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';

// =============================================================================
// Badge Component (if not already created)
// =============================================================================

const BadgeComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline: 'text-foreground border border-input hover:bg-accent hover:text-accent-foreground',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
BadgeComponent.displayName = 'Badge';

// =============================================================================
// Command Components (simplified versions)
// =============================================================================

const Command = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
      className
    )}
    {...props}
  />
));
Command.displayName = 'Command';

const CommandInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0',
        className
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = 'CommandInput';

const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('py-6 text-center text-sm text-muted-foreground', className)}
    {...props}
  />
));
CommandEmpty.displayName = 'CommandEmpty';

const CommandGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
      className
    )}
    {...props}
  />
));
CommandGroup.displayName = 'CommandGroup';

const CommandItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    onSelect?: () => void;
  }
>(({ className, onSelect, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    onClick={onSelect}
    {...props}
  />
));
CommandItem.displayName = 'CommandItem';

// =============================================================================
// Multi-Select Option Interface
// =============================================================================

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
  category?: string;
  disabled?: boolean;
}

// =============================================================================
// Multi-Select Component Props
// =============================================================================

interface MultiSelectProps extends React.HTMLAttributes<HTMLDivElement> {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  error?: string;
  renderBadge?: (option: MultiSelectOption) => React.ReactNode;
  renderOption?: (option: MultiSelectOption) => React.ReactNode;
}

// =============================================================================
// Main Multi-Select Component
// =============================================================================

export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(({
  options,
  value,
  onChange,
  placeholder = 'Select items...',
  maxItems,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  className,
  disabled = false,
  error,
  renderBadge,
  renderOption,
  ...props
}, ref) => {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');

  // Filter options based on search and selected values
  const filteredOptions = React.useMemo(() => {
    return options.filter((option) => {
      const matchesSearch = option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
                           option.description?.toLowerCase().includes(searchValue.toLowerCase());
      return matchesSearch && !option.disabled;
    });
  }, [options, searchValue]);

  // Get selected options for display
  const selectedOptions = React.useMemo(() => {
    return options.filter((option) => value.includes(option.value));
  }, [options, value]);

  // Handle option selection
  const handleSelect = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v: string) => v !== optionValue)
      : maxItems && value.length >= maxItems
      ? [...value.slice(1), optionValue] // Replace oldest if at max
      : [...value, optionValue];
    
    onChange(newValue);
  };

  // Handle removing a selected item
  const handleRemove = (optionValue: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onChange(value.filter((v: string) => v !== optionValue));
  };

  // Clear all selections
  const handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onChange([]);
  };

  // Group options by category if available
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, MultiSelectOption[]> = {};
    filteredOptions.forEach((option) => {
      const category = option.category || 'General';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(option);
    });
    return groups;
  }, [filteredOptions]);

  return (
    <div className={cn('w-full', className)} ref={ref} {...props}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between min-h-10 h-auto py-2',
              selectedOptions.length === 0 && 'text-muted-foreground',
              error && 'border-red-500',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedOptions.length === 0 ? (
                <span>{placeholder}</span>
              ) : (
                selectedOptions.slice(0, 3).map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="text-xs"
                  >
                    {renderBadge ? renderBadge(option) : option.label}
                    <button
                      type="button"
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onMouseDown={(e) => handleRemove(option.value, e)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {option.label}</span>
                    </button>
                  </Badge>
                ))
              )}
              {selectedOptions.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedOptions.length - 3} more
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {selectedOptions.length > 0 && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-sm opacity-50 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear all</span>
                </button>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            
            <div className="max-h-64 overflow-y-auto">
              {Object.entries(groupedOptions).map(([category, categoryOptions]) => (
                <CommandGroup key={category} heading={category}>
                  {categoryOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      onSelect={() => handleSelect(option.value)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        {renderOption ? (
                          renderOption(option)
                        ) : (
                          <>
                            <span>{option.label}</span>
                            {option.description && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <Check
                        className={cn(
                          'ml-2 h-4 w-4 shrink-0',
                          value.includes(option.value) ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </div>
          </Command>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
});

MultiSelect.displayName = 'MultiSelect';