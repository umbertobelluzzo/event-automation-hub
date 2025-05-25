#!/bin/bash

# UIS Event-Automation Hub - Initial Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up UIS Event-Automation Hub..."

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null || ! node --version | grep -E "v(20|21|22)" &> /dev/null; then
        echo "❌ Node.js 20+ is required. Please install it first."
        exit 1
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        echo "📦 Installing pnpm..."
        npm install -g pnpm
    fi
    
    # Check Python version
    if ! command -v python3 &> /dev/null || ! python3 --version | grep -E "3\.(11|12)" &> /dev/null; then
        echo "❌ Python 3.11+ is required. Please install it first."
        exit 1
    fi
    
    # Check pip
    if ! command -v pip3 &> /dev/null; then
        echo "❌ pip3 is required. Please install it first."
        exit 1
    fi
    
    echo "✅ Prerequisites check passed!"
}

# Create directory structure
create_directories() {
    echo "📁 Creating directory structure..."
    
    # Create main directories
    mkdir -p frontend/{app,components,hooks,lib,styles}
    mkdir -p frontend/app/{create-event/{steps,components},dashboard/{events,analytics},api/{auth,events,ai}}
    mkdir -p frontend/components/{ui,forms,layout,ai}
    
    mkdir -p backend/src/{routes,middleware,services,utils,types}
    mkdir -p backend/dist
    
    mkdir -p agents/{orchestrator,content_agents,service_agents,prompts,tools,utils}
    
    mkdir -p database/{migrations,seed}
    
    mkdir -p tests/{frontend/{components,hooks,pages,e2e},backend/{routes,services,integration},agents}
    
    mkdir -p shared/{types,constants,utils}
    
    mkdir -p docs/images
    
    mkdir -p storage/{uploads,sessions,logs}
    
    echo "✅ Directory structure created!"
}

# Create essential files
create_files() {
    echo "📄 Creating essential configuration files..."
    
    # Create .gitkeep files for empty directories
    find . -type d -empty -exec touch {}/.gitkeep \;
    
    # Create package.json files
    cat > frontend/package.json << 'EOF'
{
  "name": "uis-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-popover": "^1.0.7",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.294.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "next-auth": "^4.24.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^8.55.0",
    "eslint-config-next": "^14.0.0",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "prettier": "^3.1.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.0"
  }
}
EOF

    cat > backend/package.json << 'EOF'
{
  "name": "uis-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0",
    "redis": "^4.6.0",
    "googleapis": "^128.0.0",
    "axios": "^1.6.0",
    "joi": "^17.11.0",
    "express-rate-limit": "^7.1.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcryptjs": "^2.4.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.2",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "vitest": "^1.0.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^6.0.0"
  }
}
EOF

    cat > agents/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
langgraph==0.0.55
langchain==0.0.350
langchain-openai==0.0.2
openai==1.3.0
pydantic==2.5.0
redis==5.0.1
python-dotenv==1.0.0
requests==2.31.0
google-auth==2.25.0
google-auth-oauthlib==1.1.0
google-auth-httplib2==0.2.0
google-api-python-client==2.110.0
pytest==7.4.0
pytest-asyncio==0.21.0
httpx==0.25.0
Pillow==10.1.0
python-multipart==0.0.6
EOF

    # Create environment template
    cat > .env.example << 'EOF'
# =============================================================================
# UIS Event-Automation Hub - Environment Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# Core Application Configuration
# -----------------------------------------------------------------------------
NODE_ENV=development
PORT=3000
BACKEND_PORT=4000
AGENTS_PORT=8000

# -----------------------------------------------------------------------------
# Database Configuration
# -----------------------------------------------------------------------------
DATABASE_URL="postgresql://username:password@localhost:5432/uis_events?schema=public"
REDIS_URL="redis://localhost:6379"

# -----------------------------------------------------------------------------
# Authentication Configuration
# -----------------------------------------------------------------------------
NEXTAUTH_SECRET=your-super-secret-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000
SESSION_TIMEOUT=7200000

# -----------------------------------------------------------------------------
# LLM & AI Configuration
# -----------------------------------------------------------------------------
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-4o
AI_AGENT_TIMEOUT=300000
MAX_CONCURRENT_WORKFLOWS=10

# -----------------------------------------------------------------------------
# Google Services Configuration
# -----------------------------------------------------------------------------
GOOGLE_SERVICE_ACCOUNT_JSON=base64_encoded_service_account_json_here
GOOGLE_DRIVE_PARENT_FOLDER_ID=optional_root_folder_id
GOOGLE_CALENDAR_ID=primary

# -----------------------------------------------------------------------------
# External Service APIs
# -----------------------------------------------------------------------------
CANVA_API_TOKEN=your_canva_api_token_here
CANVA_TEMPLATE_ID=default_event_template_id
CANVA_BRAND_KIT_ID=uis_brand_kit_id

CLICKUP_API_TOKEN=your_clickup_api_token_here
CLICKUP_SPACE_ID=uis_events_space_id
CLICKUP_LIST_ID=events_list_id

# -----------------------------------------------------------------------------
# Rate Limiting & Security
# -----------------------------------------------------------------------------
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
API_KEY_ROTATION_ENABLED=false

# -----------------------------------------------------------------------------
# Logging & Monitoring
# -----------------------------------------------------------------------------
LOG_LEVEL=debug
LOG_FILE_PATH=./storage/logs/app.log
ENABLE_REQUEST_LOGGING=true

# -----------------------------------------------------------------------------
# Development & Testing
# -----------------------------------------------------------------------------
ENABLE_MOCK_SERVICES=false
TEST_DATABASE_URL="postgresql://username:password@localhost:5432/uis_events_test"
SEED_DATABASE=true
EOF

    # Create TypeScript configuration
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./frontend/*"],
      "@/components/*": ["./frontend/components/*"],
      "@/lib/*": ["./frontend/lib/*"],
      "@/hooks/*": ["./frontend/hooks/*"],
      "@/shared/*": ["./shared/*"],
      "@/backend/*": ["./backend/src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "build",
    ".next"
  ]
}
EOF

    echo "✅ Essential files created!"
}

# Initialize package installations
setup_dependencies() {
    echo "📦 Installing dependencies..."
    
    # Install root dependencies
    pnpm install
    
    # Install frontend dependencies
    cd frontend && pnpm install && cd ..
    
    # Install backend dependencies  
    cd backend && pnpm install && cd ..
    
    # Install Python dependencies
    cd agents && pip3 install -r requirements.txt && cd ..
    
    echo "✅ Dependencies installed!"
}

# Initialize git repository
setup_git() {
    echo "🔧 Setting up git repository..."
    
    if [ ! -d .git ]; then
        git init
    fi
    
    # Create comprehensive .gitignore
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Snowpack dependency directory (https://snowpack.dev/)
web_modules/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next
out/

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# TypeScript compiled output
dist/
build/

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
pip-wheel-metadata/
share/python-wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# PyInstaller
*.manifest
*.spec

# Unit test / coverage reports
htmlcov/
.tox/
.nox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.py,cover
.hypothesis/
.pytest_cache/

# Jupyter Notebook
.ipynb_checkpoints

# IPython
profile_default/
ipython_config.py

# pyenv
.python-version

# Environments
.env
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Application specific
storage/uploads/*
storage/sessions/*
storage/logs/*
!storage/.gitkeep
!storage/uploads/.gitkeep
!storage/sessions/.gitkeep
!storage/logs/.gitkeep

# Database
*.db
*.sqlite
*.sqlite3

# Redis dump
dump.rdb

# Heroku
.slugignore

# Local environment files
.env.local
.env.*.local
EOF
    
    git add .
    git commit -m "Initial commit: Project structure and configuration"
    
    echo "✅ Git repository initialized!"
}

# Main execution
main() {
    check_prerequisites
    create_directories
    create_files
    setup_dependencies
    setup_git
    
    echo ""
    echo "🎉 UIS Event-Automation Hub setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Copy .env.example to .env and configure your API keys"
    echo "2. Set up your database (PostgreSQL) and Redis"
    echo "3. Run 'pnpm dev' to start all development servers"
    echo "4. Access the application at http://localhost:3000"
    echo ""
    echo "For detailed documentation, check the docs/ folder."
    echo "Happy coding! 🚀"
}

# Run main function
main "$@"