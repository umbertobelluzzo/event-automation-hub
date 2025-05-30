import { PrismaClient, UserRole, EventType, EventStatus, WorkflowStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // =============================================================================
  // System Configuration
  // =============================================================================
  console.log('📋 Creating system configuration...');
  
  const systemConfigs = [
    {
      key: 'CANVA_DEFAULT_TEMPLATE_ID',
      value: 'DAFxxxxxxxxxxxxxx',
      description: 'Default Canva template for event flyers',
    },
    {
      key: 'MAX_CONCURRENT_WORKFLOWS',
      value: '10',
      description: 'Maximum number of concurrent AI workflows',
    },
    {
      key: 'DEFAULT_EVENT_TIMEZONE',
      value: 'Europe/London',
      description: 'Default timezone for events',
    },
    {
      key: 'AI_GENERATION_TIMEOUT_MS',
      value: '300000',
      description: 'Timeout for AI content generation (5 minutes)',
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: config,
    });
  }

  // =============================================================================
  // Sample Users
  // =============================================================================
  console.log('👥 Creating sample users...');

  const users = [
    {
      id: 'admin-001',
      email: 'admin@uniteditalian.org',
      name: 'UIS Admin',
      role: UserRole.ADMIN,
    },
    {
      id: 'organizer-001',
      email: 'events@uniteditalian.org',
      name: 'Event Organizer',
      role: UserRole.ORGANIZER,
    },
    {
      id: 'volunteer-001',
      email: 'volunteer1@uniteditalian.org',
      name: 'Maria Rossi',
      role: UserRole.VOLUNTEER,
    },
    {
      id: 'volunteer-002',
      email: 'volunteer2@uniteditalian.org',
      name: 'Giuseppe Bianchi',
      role: UserRole.VOLUNTEER,
    },
    {
      id: 'dev-user-1',
      email: 'dev@example.com',
      name: 'Development User',
      role: UserRole.ADMIN,
    }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role },
      create: user,
    });
  }

  // =============================================================================
  // Sample Events
  // =============================================================================
  console.log('🎉 Creating sample events...');

  const events = [
    {
      id: 'event-001',
      title: 'Italian Language Workshop',
      description: 'Learn basic Italian phrases and conversation skills with native speakers.',
      slug: 'italian-language-workshop-2024',
      eventType: EventType.EDUCATIONAL,
      startDate: new Date('2024-02-15T19:00:00Z'),
      endDate: new Date('2024-02-15T21:00:00Z'),
      locationName: 'UIS Community Center',
      locationAddress: '123 High Street, London SW1A 1AA',
      isOnline: false,
      isFree: false,
      ticketPrice: 15.0,
      registrationRequired: true,
      maxAttendees: 30,
      status: EventStatus.PUBLISHED,
      isPublished: true,
      publishedAt: new Date('2024-01-15T10:00:00Z'),
      tags: ['language', 'education', 'beginner'],
      createdBy: 'organizer-001',
    },
    {
      id: 'event-002',
      title: 'Italian Cinema Night: La Vita è Bella',
      description: 'Join us for a screening of Roberto Benigni\'s masterpiece with English subtitles.',
      slug: 'italian-cinema-night-vita-bella',
      eventType: EventType.CULTURAL,
      startDate: new Date('2024-02-22T20:00:00Z'),
      endDate: new Date('2024-02-22T22:30:00Z'),
      locationName: 'UIS Theater Room',
      locationAddress: '123 High Street, London SW1A 1AA',
      isOnline: false,
      isFree: true,
      registrationRequired: true,
      maxAttendees: 60,
      status: EventStatus.APPROVED,
      isPublished: false,
      tags: ['cinema', 'culture', 'italian-films'],
      createdBy: 'volunteer-001',
    },
    {
      id: 'event-003',
      title: 'Virtual Italian Cooking Class: Pasta Making',
      description: 'Learn to make authentic Italian pasta from scratch with Chef Marco.',
      slug: 'virtual-pasta-making-class',
      eventType: EventType.COMMUNITY,
      startDate: new Date('2024-03-01T18:00:00Z'),
      endDate: new Date('2024-03-01T20:00:00Z'),
      locationName: 'Online Event',
      locationAddress: 'Virtual',
      isOnline: true,
      meetingLink: 'https://zoom.us/j/123456789',
      isFree: false,
      ticketPrice: 25.0,
      registrationRequired: true,
      maxAttendees: 20,
      status: EventStatus.DRAFT,
      isPublished: false,
      tags: ['cooking', 'pasta', 'virtual', 'hands-on'],
      createdBy: 'volunteer-002',
    },
  ];

  for (const event of events) {
    const { id, createdAt, updatedAt, ...dataToUpdate } = event as any;
    await prisma.event.upsert({
      where: { id: event.id },
      update: dataToUpdate,
      create: event,
    });
  }

  // =============================================================================
  // Sample Generated Content
  // =============================================================================
  console.log('🎨 Creating sample generated content...');

  const generatedContent = [
    {
      eventId: 'event-001',
      flyerUrl: 'https://export-download.canva.com/sample-flyer-001.png',
      flyerCanvaId: 'DAFxxxxxxxxxxxxxx',
      instagramCaption: `🇮🇹 Ready to speak Italian? Join our language workshop this Thursday! 
      
✨ Perfect for beginners
👥 Native speaker instructors  
📍 UIS Community Center
🎟️ £15 per person

Link in bio to register! #UISLondon #ItalianLanguage #LearnItalian #CommunityEvent`,
      linkedinCaption: `Enhance your language skills with our Italian Language Workshop at the United Italian Societies.\n\nOur experienced native speakers will guide you through essential phrases and conversation techniques in a supportive community environment.\n\n📅 February 15th, 7:00 PM\n📍 UIS Community Center, London\n💼 Perfect for professionals and enthusiasts alike\n\nRegister now: [link] #ProfessionalDevelopment #Languages #Networking`,
      whatsAppMessageText: `🇮🇹 Ciao UIS Community!\n\nJoin us for an Italian Language Workshop this Thursday, Feb 15th at 7 PM at our Community Center.\n\nPerfect for beginners - native speakers will teach you essential phrases and conversation skills.\n\n£15 per person, register at: [link]\n\nGrazie! 🙌`,
      flyerStyle: 'professional',
      targetAudience: ['language-learners', 'professionals', 'italian-culture-enthusiasts'],
      keyMessages: ['beginner-friendly', 'native-speakers', 'practical-conversation'],
      socialTone: 'friendly',
      generatedAt: new Date('2024-01-15T09:30:00Z'),
    },
    {
      eventId: 'event-002',
      flyerUrl: 'https://export-download.canva.com/sample-flyer-002.png',
      flyerCanvaId: 'DAFyyyyyyyyyyyyyy',
      instagramCaption: `🎬 Italian Cinema Night is back! 

This Thursday we're screening "La Vita è Bella" - Roberto Benigni's Oscar-winning masterpiece that will make you laugh and cry.

🆓 FREE event
🍿 Popcorn provided
📍 UIS Theater Room
⏰ 8:00 PM

Tag someone who loves great cinema! #UISLondon #ItalianCinema #LaVitaEBella #CommunityEvent`,
      linkedinCaption: `Experience cinematic excellence at our Italian Cinema Night featuring "La Vita è Bella".\n\nRoberto Benigni's Academy Award-winning film offers both entertainment and profound storytelling - perfect for film enthusiasts and Italian culture appreciators.\n\n📅 February 22nd, 8:00 PM\n📍 UIS Theater Room\n🎭 Free admission, registration required\n\nJoin our community for an evening of exceptional Italian cinema. #Culture #Film #ItalianHeritage`,
      whatsAppMessageText: `🎬 Cinema lovers!\n\nJoin us Thursday, Feb 22nd at 8 PM for Italian Cinema Night.\n\nWe're screening "La Vita è Bella" - the beautiful Oscar-winning film by Roberto Benigni.\n\nFREE event at UIS Theater Room. Register: [link]\n\nSee you there! 🍿`,
      flyerStyle: 'artistic',
      targetAudience: ['film-enthusiasts', 'culture-lovers', 'community-members'],
      keyMessages: ['oscar-winning', 'free-event', 'community-experience'],
      socialTone: 'enthusiastic',
      generatedAt: new Date('2024-01-20T14:15:00Z'),
    },
  ];

  for (const content of generatedContent) {
    await prisma.generatedContent.upsert({
      where: { eventId: content.eventId },
      update: content,
      create: content,
    });
  }

  // =============================================================================
  // Sample Workflow Sessions
  // =============================================================================
  console.log('🤖 Creating sample workflow sessions...');

  const workflowSessions = [
    {
      id: 'workflow-001',
      sessionId: 'session_abc123def456',
      eventId: 'event-001',
      userId: 'organizer-001',
      status: WorkflowStatus.COMPLETED,
      currentStep: 'save_assets',
      completedSteps: [
        'validate_input',
        'create_flyer',
        'create_captions',
        'create_whatsapp',
        'human_review',
        'schedule_calendar',
        'create_task',
        'save_assets',
      ],
      failedSteps: [],
      startedAt: new Date('2024-01-15T09:00:00Z'),
      completedAt: new Date('2024-01-15T09:35:00Z'),
      llmModel: 'openai/gpt-4o',
      agentConfig: {
        temperature: 0.7,
        maxTokens: 2000,
        flyerStyle: 'professional',
        socialTone: 'friendly',
      },
    },
    {
      id: 'workflow-002',
      sessionId: 'session_xyz789ghi012',
      eventId: 'event-002',
      userId: 'volunteer-001',
      status: WorkflowStatus.WAITING_APPROVAL,
      currentStep: 'human_review',
      completedSteps: ['validate_input', 'create_flyer', 'create_captions', 'create_whatsapp'],
      failedSteps: [],
      startedAt: new Date('2024-01-20T14:00:00Z'),
      estimatedEndTime: new Date('2024-01-20T14:30:00Z'),
      llmModel: 'openai/gpt-4o',
      agentConfig: {
        temperature: 0.8,
        maxTokens: 2000,
        flyerStyle: 'artistic',
        socialTone: 'enthusiastic',
      },
    },
  ];

  for (const session of workflowSessions) {
    const { id, createdAt, updatedAt, ...dataToUpdate } = session as any;
    await prisma.workflowSession.upsert({
      where: { id: session.id },
      update: dataToUpdate,
      create: session,
    });
  }

  console.log('✅ Database seeding completed successfully!');
  console.log(`
📊 Summary:
- ${systemConfigs.length} system configurations
- ${users.length} users created
- ${events.length} events created  
- ${generatedContent.length} generated content records
- ${workflowSessions.length} workflow sessions

🚀 Database is ready for development!
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
