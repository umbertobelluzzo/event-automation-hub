// =============================================================================
// utils/validate-env.ts - Environment Variable Validation
// =============================================================================

export const validateEnv = (): void => {
    const required = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'OPENROUTER_API_KEY',
    ];
  
    const missing = required.filter(key => !process.env[key]);
  
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:');
      missing.forEach(key => console.error(`   - ${key}`));
      console.error('\n💡 Copy .env.example to .env and configure the missing variables.');
      process.exit(1);
    }
  
    // Validate specific formats
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
      console.error('❌ DATABASE_URL must be a valid PostgreSQL connection string');
      process.exit(1);
    }
  
    if (process.env.REDIS_URL && !process.env.REDIS_URL.startsWith('redis://')) {
      console.error('❌ REDIS_URL must be a valid Redis connection string');
      process.exit(1);
    }
  
    // Validate ports
    const ports = ['BACKEND_PORT', 'AGENTS_PORT'];
    ports.forEach(portKey => {
      const port = process.env[portKey];
      if (port && (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535)) {
        console.error(`❌ ${portKey} must be a valid port number (1-65535)`);
        process.exit(1);
      }
    });
  
    console.log('✅ Environment validation passed');
  };
  