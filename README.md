# Note Companion (File Organizer 2000)

An AI-powered Obsidian plugin that automatically organizes, formats, and enhances your notes with intelligent features.

## 📢 Important Disclosures

### Account & Payment Requirements

- **Payment required for cloud service**: The plugin requires a paid subscription to use the cloud-hosted service
- **7-day free trial**: New subscriptions include a 7-day trial period
- **Self-hosting option available**: You can run your own instance for free (see [Self-Hosting Instructions](#-self-hosting) below)
- **Account creation**: Using the cloud service requires creating an account at [notecompanion.ai](https://notecompanion.ai)

### Network Usage

This plugin communicates with the following remote services:

- **Note Companion API Server** (cloud service): For AI-powered features including file classification, formatting, transcription, and chat
- **YouTube API**: For fetching video transcripts when processing YouTube links
- **AI Provider APIs**: When self-hosting, you'll connect directly to your chosen AI provider (OpenAI, Anthropic, Google, etc.)

### Privacy & Data Handling

- **Cloud service**: Files are processed through our secure API for AI analysis
- **Self-hosted**: All processing happens on your own server, data never leaves your control
- Usage statistics are collected only for the cloud service to manage billing and rate limits
- Your vault content remains private and is only processed when you explicitly use plugin features
- View our full privacy policy at [notecompanion.ai/privacy](https://notecompanion.ai/privacy)

## 🏗️ Project Structure

This is a monorepo project managed with pnpm workspaces and Turborepo. The project consists of several packages:

```
note-companion/
├── packages/
│   ├── plugin/          # Obsidian plugin (TypeScript, React 19)
│   ├── web/             # Web application (Next.js 15, React 19)
│   ├── mobile/          # Mobile app (React Native, Expo SDK 52)
│   └── landing/         # Marketing website (Next.js 15)
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

## 🚀 Getting Started

You have two options for using Note Companion:

### Option 1: Cloud Service (Easiest)

1. Install the plugin from Obsidian Community Plugins
2. Sign up at [notecompanion.ai](https://notecompanion.ai)
3. Start your 7-day free trial
4. Enter your license key in the plugin settings

### Option 2: Self-Hosting (Free, Technical)

See the [Self-Hosting section](#-self-hosting) below for detailed instructions.

## 🏠 Self-Hosting

Self-hosting allows you to run Note Companion on your own server for free. You'll only need to provide your own AI API keys.

### Quick Start

1. **Clone and install:**

```bash
git clone https://github.com/Nexus-JPF/note-companion.git
cd note-companion
pnpm install
```

2. **Configure environment:**
   Create a `.env` file in `packages/web` with:

```env
OPENAI_API_KEY=your_api_key_here
```

Get your API key from [platform.openai.com](https://platform.openai.com)

3. **Build and start the server:**

```bash
cd packages/web
pnpm build:self-host
pnpm start
```

4. **Configure the plugin:**

- In Obsidian, go to Note Companion settings
- Enable "Self-hosting mode"
- Set server URL to `http://localhost:3010`
- Your plugin is now connected to your local server!

For detailed instructions, troubleshooting, and advanced configuration, see [SELF-HOSTING.md](SELF-HOSTING.md).

### Development Setup

For development and contributing:

#### Prerequisites

- Node.js 18+
- pnpm 10.8.1+
- Git

#### Installation

1. Clone the repository:

```bash
git clone https://github.com/Nexus-JPF/note-companion.git
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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Website](https://notecompanion.ai)
- [Documentation](https://notecompanion.ai/docs) (redirects to GitHub)
- [GitHub Issues](https://github.com/Nexus-JPF/note-companion/issues)
