# File Organizer 2000 - Project Analysis

## Overview
File Organizer 2000 is an AI-powered file organization system that integrates with Obsidian as a plugin. The project aims to help users manage their digital knowledge and files more effectively by providing intelligent organization, transcription, and file management capabilities.

## Core Components

### 1. Obsidian Plugin
The main component is an Obsidian plugin that provides:
- AI-powered file organization
- File inbox management
- Daily activity tracking
- Audio transcription capabilities
- Natural language file interactions

### 2. Web Application
A Next.js web application that provides:
- User authentication and management
- API endpoints for various services
- Subscription and payment handling
- Self-hosting capabilities

### 3. Audio Server
Dedicated service for:
- Audio file processing
- Transcription services
- Converting audio content to text

### 4. Shared Utilities
Common code and utilities shared between different packages:
- Type definitions
- Helper functions
- Shared constants

## Key Features

### 1. PARA Method Integration
The system implements the PARA method for file organization:
- Projects: Active projects and tasks
- Areas: Ongoing responsibilities
- Resources: Reference materials
- Archives: Completed or inactive items

### 2. AI-Powered Organization
- Automatic file classification
- Smart file categorization
- Content-based organization
- Natural language processing for file management

### 3. Activity Tracking
- ScreenpipeHandler for monitoring daily activities
- LastModifiedHandler for tracking recent changes
- Automated activity summaries

### 4. Premium Features
- Managed through CatalystGate
- Token usage tracking
- Credit system for AI operations
- Subscription-based access control

## Technical Architecture

### Monorepo Structure
```
packages/
├── web/           # Next.js web application
├── plugin/        # Obsidian plugin
├── shared/        # Shared utilities
└── release-notes/ # Release notes generator
```

### Key Services

1. **FileOrganizer**
   - Central plugin management
   - Core file organization logic
   - AI integration coordination

2. **InboxSystem**
   - File queue management
   - Processing state tracking
   - Action execution

3. **AI Integration**
   - Natural language processing
   - File classification
   - Content analysis
   - Action generation

4. **User Management**
   - Authentication
   - Subscription handling
   - Usage tracking
   - Credit management

## Purpose and Goals

The File Organizer 2000 exists to solve several key problems:

1. **Information Overload**
   - Helps users manage large volumes of digital content
   - Provides intelligent organization systems
   - Reduces manual file management overhead

2. **Knowledge Management**
   - Implements PARA methodology for better organization
   - Enables efficient content retrieval
   - Maintains contextual relationships between files

3. **Workflow Automation**
   - Automates repetitive file organization tasks
   - Provides AI-powered file classification
   - Streamlines content processing workflows

4. **Content Accessibility**
   - Audio transcription for better searchability
   - Smart categorization for easy retrieval
   - Context-aware file organization

## Development Workflow

### Build Process
```bash
pnpm i          # Install dependencies
pnpm build      # Build all packages
```

### Key Development Commands
- `pnpm next dev` - Development server (PORT=3010)
- `node esbuild.config.mjs` - Plugin development
- `pnpm test` - Run tests
- `pnpm next lint` - Code linting

### Release Process
- Automated via GitHub Actions
- Triggered by tag pushes
- Includes main.js, manifest.json, styles.css

## Future Considerations

1. **Scalability**
   - Handling larger file volumes
   - Improving processing efficiency
   - Optimizing resource usage

2. **Integration Opportunities**
   - Additional platform support
   - More AI service providers
   - Extended file format support

3. **Feature Expansion**
   - Enhanced automation capabilities
   - Advanced classification systems
   - Improved user customization options

## Conclusion

File Organizer 2000 represents a sophisticated approach to modern knowledge management, combining AI capabilities with established organizational methodologies. Its modular architecture and extensible design allow for continued growth and adaptation to user needs while maintaining a focus on efficient file organization and accessibility.
