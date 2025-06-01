# AgentSalud MVP 🏥

AI-powered healthcare appointment booking system with intelligent scheduling, role-based dashboards, and multi-tenant architecture.

## 🚀 Features

### Core Functionality
- **AI-Powered Booking**: Natural language appointment scheduling with OpenAI integration
- **Hybrid Booking Flow**: Express (auto-assignment) and Personalized booking options
- **Role-Based Dashboards**: Patient, Doctor, Staff, Admin, and SuperAdmin interfaces
- **Multi-Tenant Architecture**: Organization-based data isolation with RLS policies
- **Real-Time Updates**: Live appointment status and availability updates

### AI & Intelligence
- **Smart Chatbot**: Natural language processing for appointment requests
- **Intelligent Scheduling**: Optimal appointment finder with conflict resolution
- **AI Recommendations**: Context-aware suggestions for appointments and rescheduling
- **Entity Extraction**: Automatic parsing of dates, times, services, and preferences

### Technical Features
- **Next.js 14**: Modern React framework with App Router
- **TypeScript**: Full type safety and developer experience
- **Supabase**: PostgreSQL database with real-time subscriptions
- **Tailwind CSS**: Responsive, mobile-first design system
- **Comprehensive Testing**: Jest, React Testing Library, E2E tests

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **AI**: OpenAI GPT-4, Custom entity extraction
- **Styling**: Tailwind CSS v4, CSS Modules
- **Testing**: Jest, React Testing Library, Cypress (planned)
- **Deployment**: Vercel (planned)

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/[username]/agensalud-mvp.git
cd agensalud-mvp
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create `.env.local` file:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Database Setup
Run Supabase migrations:
```bash
npm run apply-migrations
```

### 5. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🧪 Testing

### Run Tests
```bash
# All tests
npm test

# Specific test suites
npm run test:ai          # AI functionality tests
npm run test:api         # API endpoint tests
npm run test:database    # Database and RLS tests
npm run test:e2e         # End-to-end tests
npm run test:integration # Integration tests

# Coverage report
npm run test:coverage
```

### Validation Scripts
```bash
npm run validate:all     # Run all validation checks
npm run validate:dashboard
npm run validate:management
npm run validate:rls
npm run validate:navigation
```

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── (auth)/         # Authentication pages
│   ├── (dashboard)/    # Protected dashboard pages
│   └── api/            # API routes
├── components/         # React components
│   ├── ai/            # AI-related components
│   ├── appointments/  # Appointment management
│   ├── dashboard/     # Dashboard components
│   └── ui/            # Reusable UI components
├── contexts/          # React contexts
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries
│   ├── ai/           # AI processing logic
│   ├── supabase/     # Database client and migrations
│   └── utils/        # Helper functions
└── types/             # TypeScript type definitions

tests/                 # Comprehensive test suite
docs/                  # Documentation
scripts/               # Utility and validation scripts
```

## 🔐 Security & Compliance

- **RBAC**: Role-based access control with granular permissions
- **RLS Policies**: Row-level security for multi-tenant data isolation
- **Data Protection**: HIPAA-compliant data handling practices
- **Authentication**: Secure user authentication with Supabase Auth
- **API Security**: Protected endpoints with proper authorization

## 🚀 Deployment

### Environment Variables
Ensure all required environment variables are set in your deployment platform.

### Build
```bash
npm run build
npm start
```

## 📖 Documentation

### 📚 Complete Documentation Suite
- **[Documentation Hub](docs/README.md)** - Central documentation portal
- **[Development Guidelines](docs/DEVELOPMENT.md)** - Development workflow and standards
- **[Technical Architecture](docs/ARCHITECTURE.md)** - System design and product requirements
- **[Changelog](docs/CHANGELOG.md)** - Version history and implementation details

### 🔧 Technical Documentation
- **[API Documentation](docs/api/README.md)** - Complete API reference and guides
- **[Database Documentation](docs/database/README.md)** - Schema, migrations, and RLS policies
- **[Testing Documentation](docs/testing/README.md)** - Comprehensive testing strategy
- **[AI Features](docs/ai/README.md)** - Natural language processing and chatbot
- **[Deployment Guide](docs/deployment/README.md)** - Production deployment procedures

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is proprietary software for AgentSalud healthcare services.

## 🆘 Support

For support and questions:
- Check the [troubleshooting guide](docs/troubleshooting/)
- Review existing [issues](../../issues)
- Contact the development team

---

**AgentSalud MVP** - Transforming healthcare appointment management with AI-powered intelligence.
