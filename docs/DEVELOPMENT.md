# 🛠️ AgentSalud MVP - Development Guidelines

## 🎯 Project Overview

AgentSalud MVP is an AI-powered healthcare appointment booking system with intelligent scheduling, role-based dashboards, and multi-tenant architecture. This document provides comprehensive development guidelines and current project status.

## ✅ Current Project Status

### 📊 MVP Progress: 100% Complete ✅
- **Infrastructure**: 100% completed
- **Authentication**: 100% completed  
- **Database**: 100% completed
- **Multi-tenant Organizations**: 100% completed
- **User Management**: 100% completed
- **Appointment System**: 100% completed
- **Doctor Schedules**: 100% completed
- **AI Appointment Booking**: 100% completed
- **Role-based Dashboards**: 100% completed
- **Calendar System**: 100% completed
- **SuperAdmin Dashboard**: 100% completed
- **AI-First Landing Page**: 100% completed
- **Natural Language Chatbot**: 100% completed
- **Testing**: 99% completed (140+ tests passing)

### 🏗️ Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **AI**: OpenAI GPT-4, Vercel AI SDK
- **Styling**: Tailwind CSS v4, CSS Modules
- **Testing**: Jest, React Testing Library
- **Deployment**: Vercel (planned)

## 🧱 Development Standards

### 📏 Code Organization
- **File Size Limit**: Maximum 500 lines per file
- **Modular Architecture**: Well-delimited modules grouped by functionality
- **Import Strategy**: Clear and consistent imports (preferably relative within packages)

### 🏷️ Naming Conventions
- **React Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Hooks**: camelCase with "use" prefix (e.g., `useAuthentication.ts`)
- **Utilities**: camelCase (e.g., `dateFormatter.ts`)
- **Types & Interfaces**: PascalCase (e.g., `UserProfileProps`, `AppointmentType`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_APPOINTMENTS_PER_DAY`)
- **API Files**: camelCase with "Api" suffix (e.g., `appointmentsApi.ts`)

### 📝 Documentation Standards
- **JSDoc**: Document functions, components, and complex types
- **Reason Comments**: Use `# Reason:` for complex logic explanations
- **Public APIs**: Document parameters, returns, and possible errors
- **Usage Examples**: Include examples for APIs and custom hooks

## 🧪 Testing Requirements

### 📊 Coverage Standards
- **Minimum Coverage**: 80% for critical functionality
- **Critical Areas**: Authentication, appointment booking, role-based access
- **Test Types**: Unit, Integration, End-to-End, Security (RLS validation)

### 🔧 Testing Tools
- **Jest**: Primary testing framework
- **React Testing Library**: Component testing
- **Supabase Local**: Database testing
- **Cypress**: Planned for E2E testing

### 📁 Test Organization
- **Location**: `/tests` directory mirroring project structure
- **Naming**: `.test.ts` or `.test.tsx` suffix
- **Required Cases**: Expected case, edge case, error case

## 🔐 Security & Compliance

### 🛡️ Security Standards
- **RBAC**: Role-based access control with granular permissions
- **RLS Policies**: Row-level security for multi-tenant data isolation
- **Data Protection**: HIPAA-compliant data handling practices
- **API Security**: Protected endpoints with proper authorization

### 🏥 Healthcare Compliance
- **Data Anonymization**: Use anonymized data for examples/tests
- **Sensitive Information**: Never store sensitive data in code/comments
- **Access Controls**: Validate role-based permissions thoroughly

## 🚀 Development Workflow

### 🌿 Git Strategy
- **Branching**: Feature branches from main
- **Commits**: Descriptive messages with action verbs and scope
- **Pull Requests**: Required for all changes
- **Code Review**: Mandatory before merging

### 📦 Package Management
- **Dependency Management**: Always use package managers (npm/yarn)
- **Manual Editing**: Prohibited for package.json, lock files
- **Version Control**: Automatic dependency resolution and conflict handling

### 🔄 Development Process
1. **Investigation**: Gather requirements and analyze existing code
2. **Planning**: Create detailed implementation plan
3. **Implementation**: Follow coding standards and best practices
4. **Testing**: Write comprehensive tests
5. **Documentation**: Update relevant documentation
6. **Review**: Code review and approval process

## 🎯 MVP Priorities

### 🏥 Core Features (Completed)
1. **Authentication** → Multi-tenant user management ✅
2. **Appointment Booking** → AI-powered scheduling ✅
3. **Role-based Dashboards** → Personalized interfaces ✅
4. **Calendar Integration** → Real-time availability ✅

### 🤖 AI-First Features (Completed)
1. **Natural Language Processing** → Conversational booking ✅
2. **Intelligent Scheduling** → Optimal appointment finder ✅
3. **Smart Recommendations** → Context-aware suggestions ✅
4. **Entity Extraction** → Automatic request parsing ✅

## 📋 Current Tasks & Maintenance

### 🔧 Ongoing Maintenance
- **Documentation Updates**: Keep docs synchronized with code changes
- **Test Coverage**: Maintain 80%+ coverage for new features
- **Security Reviews**: Regular RLS policy validation
- **Performance Monitoring**: Track and optimize system performance

### 🚨 Critical Standards
- **Zero Date Displacement**: Validate timezone handling across all flows
- **Role-based Validation**: Ensure proper access controls
- **Multi-tenant Isolation**: Verify data separation
- **API Consistency**: Maintain standardized response formats

## 🛠️ Development Commands

### 🏃‍♂️ Development Server
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
```

### 🧪 Testing Commands
```bash
npm test             # Run all tests
npm run test:ai      # AI functionality tests
npm run test:api     # API endpoint tests
npm run test:database # Database and RLS tests
npm run test:coverage # Coverage report
```

### ✅ Validation Scripts
```bash
npm run validate:all        # Run all validation checks
npm run validate:dashboard  # Dashboard validation
npm run validate:management # Management pages
npm run validate:rls       # RLS policies
npm run validate:navigation # Navigation consistency
```

## 🎯 Quality Assurance

### 📊 Success Metrics
- **Build Status**: ✅ Successful compilation
- **Test Coverage**: ✅ 99% (140+ tests passing)
- **Code Quality**: ✅ TypeScript strict mode
- **Performance**: ✅ Optimized for production

### 🔍 Code Review Checklist
- [ ] Follows naming conventions
- [ ] Respects 500-line file limit
- [ ] Includes appropriate tests
- [ ] Documents complex logic
- [ ] Validates security requirements
- [ ] Maintains multi-tenant isolation

## 📚 Additional Resources

### 📖 Documentation Links
- [Technical Architecture](ARCHITECTURE.md)
- [API Documentation](api/README.md)
- [Database Schema](database/schema.md)
- [Testing Guidelines](testing/README.md)

### 🔗 External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Last Updated**: January 2025  
**Status**: MVP Complete - Maintenance Mode  
**Next Phase**: Production deployment preparation
