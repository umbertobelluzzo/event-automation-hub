// =============================================================================
// utils/slug.ts - URL Slug Generation
// =============================================================================

/**
 * Generates a URL-friendly slug from event title and date
 */
export const generateSlug = (title: string, date: Date): string => {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const titleSlug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .slice(0, 50); // Limit length
  
    return `${titleSlug}-${dateStr}`;
  };
  
  /**
   * Generates a unique slug by checking database for conflicts
   */
  export const generateUniqueSlug = async (
    title: string,
    date: Date,
    prisma: any,
    excludeId?: string
  ): Promise<string> => {
    let baseSlug = generateSlug(title, date);
    let slug = baseSlug;
    let counter = 1;
  
    while (true) {
      const existing = await prisma.event.findFirst({
        where: {
          slug,
          ...(excludeId && { id: { not: excludeId } }),
        },
      });
  
      if (!existing) {
        break;
      }
  
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  
    return slug;
  };
  