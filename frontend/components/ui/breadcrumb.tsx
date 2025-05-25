import * as React from 'react';
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// =============================================================================
// Breadcrumb Types
// =============================================================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  className?: string;
  homeIcon?: boolean;
  homeHref?: string;
}

// =============================================================================
// Breadcrumb Components
// =============================================================================

const BreadcrumbRoot = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<'nav'> & {
    separator?: React.ReactNode;
  }
>(({ className, ...props }, ref) => (
  <nav ref={ref} aria-label="breadcrumb" {...props} />
));
BreadcrumbRoot.displayName = 'Breadcrumb';

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<'ol'>
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5',
      className
    )}
    {...props}
  />
));
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<'li'>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn('inline-flex items-center gap-1.5', className)}
    {...props}
  />
));
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'> & {
    asChild?: boolean;
    href?: string;
  }
>(({ asChild, className, href, ...props }, ref) => {
  if (asChild) {
    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        className={cn('transition-colors hover:text-foreground', className)}
        {...props}
      />
    );
  }

  if (href) {
    return (
      <Link
        ref={ref}
        href={href}
        className={cn('transition-colors hover:text-foreground', className)}
        {...props}
      />
    );
  }

  return (
    <a
      ref={ref}
      className={cn('transition-colors hover:text-foreground', className)}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<'span'>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn('font-normal text-foreground', className)}
    {...props}
  />
));
BreadcrumbPage.displayName = 'BreadcrumbPage';

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<'li'>) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn('[&>svg]:size-3.5', className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<'span'>) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
);
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

// =============================================================================
// Main Breadcrumb Component
// =============================================================================

export const Breadcrumb = React.forwardRef<
  HTMLElement,
  BreadcrumbProps
>(({
  items,
  separator,
  maxItems = 3,
  className,
  homeIcon = true,
  homeHref = '/',
  ...props
}, ref) => {
  const renderBreadcrumbItem = (item: BreadcrumbItem, index: number, isLast: boolean) => {
    const Icon = item.icon;
    
    const content = (
      <span className="flex items-center gap-1.5">
        {Icon && <Icon className="h-4 w-4" />}
        {item.label}
      </span>
    );

    if (isLast) {
      return (
        <BreadcrumbItem key={index}>
          <BreadcrumbPage className={item.disabled ? 'opacity-50' : ''}>
            {content}
          </BreadcrumbPage>
        </BreadcrumbItem>
      );
    }

    return (
      <React.Fragment key={index}>
        <BreadcrumbItem>
          {item.href && !item.disabled ? (
            <BreadcrumbLink href={item.href}>
              {content}
            </BreadcrumbLink>
          ) : (
            <span className={cn(
              'flex items-center gap-1.5',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}>
              {content}
            </span>
          )}
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          {separator}
        </BreadcrumbSeparator>
      </React.Fragment>
    );
  };

  const renderCollapsedBreadcrumbs = () => {
    if (items.length <= maxItems) {
      return items.map((item, index) => 
        renderBreadcrumbItem(item, index, index === items.length - 1)
      );
    }

    const firstItems = items.slice(0, 1);
    const lastItems = items.slice(-(maxItems - 2));
    const hiddenItems = items.slice(1, -(maxItems - 2));

    return (
      <>
        {/* First item */}
        {firstItems.map((item, index) => 
          renderBreadcrumbItem(item, index, false)
        )}
        
        {/* Ellipsis with dropdown */}
        <BreadcrumbItem>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
              >
                <BreadcrumbEllipsis />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex flex-col space-y-1">
                {hiddenItems.map((item, index) => (
                  <div key={index} className="flex items-center">
                    {item.href && !item.disabled ? (
                      <BreadcrumbLink 
                        href={item.href}
                        className="block px-2 py-1 text-sm rounded hover:bg-accent"
                      >
                        <span className="flex items-center gap-2">
                          {item.icon && <item.icon className="h-4 w-4" />}
                          {item.label}
                        </span>
                      </BreadcrumbLink>
                    ) : (
                      <span className={cn(
                        'block px-2 py-1 text-sm flex items-center gap-2',
                        item.disabled && 'opacity-50'
                      )}>
                        {item.icon && <item.icon className="h-4 w-4" />}
                        {item.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          {separator}
        </BreadcrumbSeparator>
        
        {/* Last items */}
        {lastItems.map((item, index) => 
          renderBreadcrumbItem(item, index + items.length - lastItems.length, index === lastItems.length - 1)
        )}
      </>
    );
  };

  // Prepare items with home if enabled
  const allItems = React.useMemo(() => {
    const breadcrumbItems = [...items];
    
    if (homeIcon && items.length > 0 && items[0].href !== homeHref) {
      breadcrumbItems.unshift({
        label: 'Home',
        href: homeHref,
        icon: Home,
      });
    }
    
    return breadcrumbItems;
  }, [items, homeIcon, homeHref]);

  if (allItems.length === 0) {
    return null;
  }

  return (
    <BreadcrumbRoot ref={ref} className={className} {...props}>
      <BreadcrumbList>
        {renderCollapsedBreadcrumbs()}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
});

Breadcrumb.displayName = 'Breadcrumb';

export {
  BreadcrumbRoot,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};