# Note Companion (File Organizer 2000)

An AI-powered Obsidian plugin that automatically organizes, formats, and enhances your notes with intelligent features.

## 🏗️ Project Structure

This is a monorepo project managed with pnpm workspaces and Turborepo. The project consists of several packages:

```
note-companion/
├── packages/
│   ├── plugin/          # Obsidian plugin (TypeScript, React 19)
│   ├── web/             # Web application (Next.js 15, React 19)
│   ├── mobile/          # Mobile app (React Native, Expo SDK 52)
│   ├── landing/         # Marketing website (Next.js 15)
│   └── audio-server/    # Audio transcription service (Express.js)
├── memory/              # Project memory and learnings
├── pnpm-workspace.yaml  # Workspace configuration
└── turbo.json          # Turborepo configuration
```

## 📦 Package Details

### `packages/plugin` - Obsidian Plugin
The core Obsidian plugin that provides AI-powered note organization.

**Tech Stack:**
- TypeScript
- React 19 for UI components
- TailwindCSS (with `fo-` prefix to avoid conflicts)
- Multiple AI provider support (OpenAI, Anthropic, Google, etc.)
- Tiptap editor integration

**Key Features:**
- Automatic file organization based on AI classification
- Custom AI prompt templates
- Audio transcription
- OCR for handwritten notes
- YouTube video summaries
- Context-aware AI chat
- Atomic note generation

### `packages/web` - Web Application
The cloud backend and web interface for the plugin.

**Tech Stack:**
- Next.js 15.1.6 with App Router
- React 19
- Drizzle ORM with PostgreSQL (Vercel Postgres)
- Clerk authentication
- Stripe payments
- AWS S3/R2 for file storage
- TailwindCSS v4

**Features:**
- User account management
- Subscription handling
- AI API endpoints
- File processing and storage
- Settings synchronization

### `packages/mobile` - Mobile Application
Cross-platform mobile app for Note Companion.

**Tech Stack:**
- React Native with Expo SDK 52
- NativeWind for styling
- Clerk authentication
- Shared functionality with web app

### `packages/landing` - Landing Page
Marketing website for Note Companion.

**Tech Stack:**
- Next.js 15.2.1
- PostHog analytics
- Framer Motion animations
- Radix UI components

### `packages/audio-server` - Audio Processing Server
Dedicated server for audio transcription services.

**Tech Stack:**
- Express.js
- Deepgram SDK
- OpenAI integration
- Multer for file uploads

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm 10.8.1+
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/different-ai/note-companion.git
cd note-companion
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
   - Copy `.env.example` files in each package to `.env.local`
   - Configure your API keys and services

### Development

Run all packages in development mode:
```bash
pnpm dev
```

Run specific packages:
```bash
# Plugin development
pnpm --filter plugin dev

# Web app development (runs on port 3010)
pnpm --filter web dev

# Mobile app
pnpm --filter mobile start
```

### Building

Build all packages:
```bash
pnpm build
```

Build specific package:
```bash
pnpm --filter plugin build
```

## 🏭 Architecture

### Core Workflow
1. **Inbox Processing**: Users place files in a designated "inbox" folder
2. **AI Classification**: The plugin analyzes files and determines appropriate organization
3. **Automatic Filing**: Files are moved to appropriate folders based on classification
4. **Enhancement**: Notes are enhanced with formatting, tags, and metadata

### AI Integration
### Deployment Options
1. **Cloud Service**: Managed subscription service
2. **Self-Hosted**: Run your own instance
3. **Local Development**: Full local setup for development

## 🛠️ Development Guidelines

### Code Style
- TypeScript for type safety
- React 19 for UI components
- TailwindCSS with `fo-` prefix in plugin
- Follow existing patterns and conventions

### Testing
- Unit tests with Jest (web package)
- Playwright for E2E testing (web/landing)
- Manual testing for Obsidian plugin

### Git Workflow
- Use descriptive commit messages
- Create feature branches
- Submit PRs for review
- Run linting before committing

## 📝 Documentation

- `/CLAUDE.md` - AI assistant instructions
- `/memory/` - Project learnings and decisions
- Package-specific READMEs in each package directory

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

[License information to be added]

## 🔗 Links

- [Website](https://notecompanion.com)
- [Documentation](https://docs.notecompanion.com)
- [GitHub Issues](https://github.com/different-ai/note-companion/issues)