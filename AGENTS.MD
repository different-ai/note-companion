# Note Companion - AI Agents Development Guide

## Overview

This document provides comprehensive guidance for AI agents (like Claude, GPT-4, etc.) working on the Note Companion codebase. It contains critical architectural decisions, code patterns, and development workflows that must be understood before making changes.

---

## Project Architecture

### Core Philosophy
Note Companion is a **document transcription and organization system** that bridges analog and digital content. The primary goal is to help users effortlessly convert physical/analog materials (handwritten notes, PDFs, voice memos) into searchable, organized digital text within their Obsidian vault.

### Package Structure

The project is a **monorepo** with four main packages:

1. **`packages/plugin/`** - Obsidian plugin (TypeScript)
   - Core file organization logic
   - Inbox monitoring and processing
   - UI integration with Obsidian
   - Event handling and record management

2. **`packages/web/`** - Next.js web application (TypeScript/React)
   - User authentication (Clerk)
   - Billing/subscriptions (Stripe)
   - AI processing endpoints
   - Database operations (Drizzle ORM)
   - API services

3. **`packages/mobile/`** - Mobile application (React Native/Expo)
   - Cross-platform iOS/Android app
   - File capture and upload
   - OAuth authentication
   - Background sync
   - Share Sheet integration

4. **`packages/landing/`** - Marketing website (Next.js)
   - Public-facing website
   - Tutorial and documentation pages

---

## AI Model Recommendations

**Use these models for specific tasks:**
- **o3-mini** - For complex reasoning and architectural decisions
- **claude-3-5-sonnet-20241022** - For PDF extraction, document processing, and content analysis

---

## Critical Implementation Guidelines

### 1. Styling System (CRITICAL - READ FIRST)

**Problem:** Obsidian plugin environment has CSS conflicts with standard frameworks.

**Solution:** Use isolated styling approach with Tailwind CSS:

#### Configuration
- Tailwind configured with custom Obsidian CSS variables
- Preflight disabled to avoid global style conflicts
- Component isolation through `StyledContainer` wrapper
- **NO PREFIX needed** - removed `fo-` prefix to allow JIT compilation

#### Implementation Pattern (REQUIRED)

For **ALL new components** in the plugin:

```tsx
import { StyledContainer } from "../../components/ui/utils";
import { tw } from "../../lib/utils";

export function MyComponent() {
  return (
    <StyledContainer>
      <div className={tw("bg-white rounded-lg p-4")}>
        {/* Component content */}
      </div>
    </StyledContainer>
  );
}
```

#### Key Rules
1. **Always** wrap component root in `StyledContainer`
2. **Always** use `tw()` function (alias for `cn()`) for className merging
3. **Never** use hardcoded CSS class names like `card` or `chat-component`
4. **Prefer** existing UI components from `components/ui/`

#### Available UI Components
- Button
- Card
- Dialog
- Badge
- etc.

#### Troubleshooting Style Conflicts
1. Verify `StyledContainer` wrapper is present
2. Check all classNames use `tw()` function
3. Look for hardcoded class names
4. Add reset styles to `.fo-container` in styles.css if needed
5. Use browser dev tools to verify Tailwind classes apply

---

### 2. File Upload Flow (Mobile → Server)

**Context:** Handles files from 0 bytes to 25MB across different platforms.

#### Architecture Overview

```
User Action → File Selection → Upload Preparation → 
R2 Upload → Backend Notification → Processing → Polling → Display
```

#### Size-Based Strategy

1. **Small Files (< 4MB)**
   - Direct upload via multipart/form-data
   - Fastest for small audio/text files
   - Endpoint: `/api/transcribe`

2. **Large Files (4MB - 25MB)**
   - Pre-signed URL upload to R2
   - Bypasses Vercel's 4.5MB body limit
   - Client uploads directly to R2
   - Backend downloads from R2 for processing

3. **Files > 25MB**
   - Error message (OpenAI Whisper API limit)
   - Instruct user to compress or split

#### Key Files

**Client-side (Mobile):**
- `packages/mobile/app/(tabs)/index.tsx` - UI and upload initiation
- `packages/mobile/utils/file-handler.ts` - Core upload logic, polling, queue
- `packages/mobile/constants/config.ts` - API URL configuration

**Server-side (Web):**
- `packages/web/app/api/create-upload-url/route.ts` - Generate pre-signed URLs
- `packages/web/app/api/record-upload/route.ts` - Record upload metadata
- `packages/web/app/api/process-file/route.ts` - Trigger processing
- `packages/web/app/api/get-upload-status/[fileId]/route.ts` - Status polling
- `packages/web/app/api/(newai)/transcribe/route.ts` - Audio transcription

#### Detailed Flow

**Phase 1: Initiation** (`index.tsx`)
- User picks file via document picker, photo library, camera, or share intent
- File normalized to `SharedFile` object
- Passed to `uploadFiles()` function

**Phase 2: Preparation** (`file-handler.ts`)
- `uploadFiles()` sets UI status to "uploading"
- Calls `handleFileProcess()` for each file
- `prepareFile()` normalizes filename, mimeType, and fileUri

**Phase 3: Upload**
1. Call `POST /api/create-upload-url` → get presigned URL
2. Upload directly to R2 via `FileSystem.uploadAsync` (PUT request)
3. Call `POST /api/record-upload` → notify backend of upload

**Phase 4: Processing**
- Call `POST /api/process-file` with fileId
- Server enqueues for background OCR/transcription

**Phase 5: Polling**
- `pollForResults()` calls `GET /api/get-upload-status/${fileId}`
- Max 30 attempts, 3-second intervals
- Returns when status is 'completed' or 'error'

**Phase 6: Display**
- Update `uploadResults` state
- Render `ProcessingStatus` component

**Phase 7: Background Sync** (Offline/Retry)
- `saveFileLocally()` stores to `pending_uploads/`
- `addToSyncQueue()` adds to sync queue
- `processSyncQueue()` retries upload when online

#### Benefits of Pre-signed URL Approach
- ✅ No Vercel body size limitations
- ✅ Reuses R2 infrastructure
- ✅ Scalable to 25MB
- ✅ Better memory usage (streaming)
- ✅ Same pattern as mobile file uploads

---

### 3. Audio Transcription

**Implementation:** Dual-tier approach based on file size (see File Upload Flow above).

**Plugin-side** (`packages/plugin/index.ts`):
- `transcribeAudio()` (line ~515) - Routes based on file size
- `transcribeAudioViaPresignedUrl()` (line ~547) - Large file handler

**Server-side:**
- `packages/web/app/api/(newai)/transcribe/route.ts`
  - `handlePresignedUrlTranscription()` - Downloads from R2 and transcribes
- Uses OpenAI Whisper API (25MB limit)

---

### 4. File Processing Pipeline

**Core workflow in plugin:**

```typescript
1. preprocess()  // Validate and prepare files
2. extract()     // Extract text content
3. classify()    // AI-based classification
4. tag()         // Automatic tagging
5. format()      // Content formatting
6. move()        // File organization
```

**Two-Phase Processing:**

**Phase 1: API Call**
- Get AI recommendations
- Process response

**Phase 2: Application**
- Apply classifications
- Update metadata
- Modify content

**Record Management:**
- Step logging
- Progress tracking
- Error handling
- Performance metrics

---

### 5. AI SDK Integration (Vercel AI SDK)

**Core Components:**

#### 1. Building Blocks
- **Single-Step LLM Generation** - Basic text generation
- **Tool Usage** - Function calling for extended capabilities
- **Multi-Agent Systems** - Multiple LLMs working together

#### 2. Implementation Patterns

**Sequential Processing (Chains):**
```typescript
async function processContent(input: string) {
  const model = openai('gpt-4o');
  
  // Step 1: Generate content
  const { text: content } = await generateText({
    model,
    prompt: `Process this input: ${input}`,
  });

  // Step 2: Quality check
  const { object: quality } = await generateObject({
    model,
    schema: z.object({
      score: z.number().min(1).max(10),
      improvements: z.array(z.string()),
    }),
    prompt: `Evaluate this content: ${content}`,
  });

  return { content, quality };
}
```

**Routing Pattern:**
```typescript
async function handleRequest(input: string) {
  // Classify first
  const { object: classification } = await generateObject({
    model,
    schema: z.object({
      type: z.enum(['general', 'technical', 'support']),
      priority: z.enum(['low', 'medium', 'high']),
    }),
    prompt: `Classify this request: ${input}`,
  });

  // Route based on classification
  const response = await generateText({
    model: classification.priority === 'high' 
      ? openai('gpt-4o')
      : openai('gpt-4o-mini'),
    system: getSystemPrompt(classification.type),
    prompt: input,
  });

  return response;
}
```

#### 3. Tool Integration

**Defining Tools:**
```typescript
const tools = {
  calculate: tool({
    description: 'Evaluate mathematical expressions',
    parameters: z.object({
      expression: z.string(),
    }),
    execute: async ({ expression }) => evaluate(expression),
  }),
  
  fetchData: tool({
    description: 'Retrieve data from database',
    parameters: z.object({
      query: z.string(),
      filters: z.array(z.string()),
    }),
    execute: async ({ query, filters }) => db.fetch(query, filters),
  }),
};
```

**Using Tools with maxSteps:**
```typescript
const { text, steps } = await generateText({
  model: openai('gpt-4o'),
  tools,
  maxSteps: 5,
  prompt: 'Analyze this data and calculate results',
});

// Access all tool calls
const allToolCalls = steps.flatMap(step => step.toolCalls);
```

---

### 6. Chatbot Integration

**Architecture:** Hybrid approach

- **Frontend:** Inside Obsidian plugin (`packages/plugin/views/ai-chat/`)
- **Backend:** Web application APIs
- **Communication:** Streaming via Vercel AI SDK

**Frontend Pattern:**
```typescript
// packages/plugin/views/ai-chat/components/Chat.tsx
import { useChat } from '@ai-sdk/react'

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    id: 'obsidian-chat',
    onResponse: (response) => {
      // Handle streaming responses
    }
  })
}
```

**Backend Pattern:**
```typescript
// packages/web/api/chat/route.ts
import { StreamingTextResponse, LangChainStream } from 'ai'

export async function POST(request: Request) {
  const { messages, context } = await request.json()
  const { stream, handlers } = LangChainStream()
  
  const result = streamText({
    model: myProvider.languageModel(selectedModel),
    messages,
    tools: {
      createNote,
      updateNote,
      searchVault
    }
  })

  return new StreamingTextResponse(stream)
}
```

**Obsidian-Specific Tools:**
- `createNote` - Create note in vault
- `updateNote` - Modify existing note
- `searchVault` - Search vault contents

---

## Development Best Practices

### 1. Code Organization

**Plugin (`packages/plugin/`):**
- Use TypeScript
- Follow Obsidian plugin architecture
- Implement proper error handling
- Test file operations thoroughly

**Web (`packages/web/`):**
- Use Next.js App Router conventions
- Implement React Server Components
- Follow REST API patterns
- Secure all endpoints

**Mobile (`packages/mobile/`):**
- Use Expo/React Native patterns
- Handle offline scenarios
- Implement background sync
- Test on both iOS and Android

### 2. Security

- Protect API keys in environment variables
- Validate user input on all endpoints
- Implement proper authentication (Clerk)
- Use rate limiting
- Secure tool execution
- Handle file permissions properly

### 3. Performance

**AI Integration:**
- Use appropriate model sizes
- Implement caching strategies
- Optimize prompt length
- Monitor token usage
- Track usage in database

**File Operations:**
- Batch operations when possible
- Stream large files
- Clean up temporary files
- Implement proper queuing

**Mobile:**
- Offline-first approach
- Efficient sync strategies
- Battery optimization
- Data usage optimization

### 4. Error Handling

**Pipeline Errors:**
- Step failure recovery
- Partial completion support
- Rollback capabilities
- Comprehensive error logging

**AI Service Errors:**
- Timeout handling
- Rate limit management
- Fallback options
- Graceful degradation

**File System Errors:**
- Access issues
- Space constraints
- Permission problems
- Sync conflict resolution

### 5. Testing

- Write unit tests for utilities
- Integration tests for API endpoints
- Test error scenarios
- Validate AI responses
- Test cross-platform (mobile)

---

## Environment Setup

### Required Environment Variables

**Web Package:**
```env
# Database
DATABASE_URL=

# Authentication (Clerk)
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

# AI Services
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
MODEL_NAME=claude-3-opus-20240229

# Payments (Stripe)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Storage (R2/S3)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

**Mobile Package:**
```env
API_URL=https://your-backend.com
```

---

## Development Workflow

### 1. Getting Started
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run specific package
cd packages/web
pnpm dev

cd packages/plugin
pnpm dev

cd packages/mobile
pnpm start
```

### 2. Making Changes

1. **Understand the context** - Read relevant cursor rules
2. **Check styling requirements** - Use StyledContainer for plugin UI
3. **Follow patterns** - Match existing code style
4. **Test locally** - Verify changes work
5. **Document changes** - Update relevant docs

### 3. Working with Specific Areas

**If working on uploads:**
- Read `file-upload-flow.mdc`
- Understand presigned URL flow
- Test with various file sizes
- Handle offline scenarios

**If working on AI features:**
- Read `ai-sdk-integration.mdc`
- Use Vercel AI SDK patterns
- Track token usage
- Implement proper error handling

**If working on chatbot:**
- Read `chatbot-integration.mdc`
- Use streaming responses
- Integrate Obsidian tools
- Handle context properly

**If working on plugin:**
- Read `plugin-development.mdc`
- Follow Obsidian guidelines
- Use StyledContainer for UI
- Test with real vault

**If working on web:**
- Read `web-development.mdc`
- Follow Next.js conventions
- Secure all endpoints
- Test authentication flow

**If working on mobile:**
- Read `mobile.mdc` and `file-upload-flow.mdc`
- Test on both platforms
- Handle offline mode
- Implement background sync

### 4. Common Patterns

**Structured Output (AI):**
```typescript
const { object } = await generateObject({
  model,
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    keywords: z.array(z.string()),
  }),
  prompt: 'Analyze this content',
});
```

**Streaming Responses:**
```typescript
const stream = await streamText({
  model,
  prompt: 'Generate a long response',
  onToken: (token) => {
    // Handle each token
  },
});
```

**Tool Orchestration:**
```typescript
const agent = {
  tools,
  maxSteps: 5,
  onToolCall: async ({ toolCall }) => {
    return await executeTool(toolCall);
  },
};
```

---

## Troubleshooting Guide

### Style Issues (Plugin)
- Missing `StyledContainer` wrapper
- Not using `tw()` function
- Hardcoded CSS classes
- Obsidian CSS conflicts

### Upload Issues (Mobile)
- File size exceeds 25MB
- Network connectivity
- Invalid presigned URL
- R2 upload failure
- Backend processing timeout

### AI Issues
- Token limits exceeded
- Rate limiting
- Invalid schema
- Model timeout
- Context too large

### Database Issues
- Connection failures
- Migration errors
- Query timeouts
- Constraint violations

---

## Key Files Reference

### Plugin
- `packages/plugin/index.ts` - Main plugin file
- `packages/plugin/views/ai-chat/` - Chat interface
- `packages/plugin/components/ui/` - UI components
- `packages/plugin/handlers/` - Event handlers

### Web
- `packages/web/app/api/(newai)/` - AI endpoints
- `packages/web/app/api/create-upload-url/route.ts` - Presigned URLs
- `packages/web/app/api/record-upload/route.ts` - Upload metadata
- `packages/web/app/api/process-file/route.ts` - Processing trigger
- `packages/web/drizzle/schema.ts` - Database schema
- `packages/web/middleware.ts` - Request middleware

### Mobile
- `packages/mobile/app/(tabs)/index.tsx` - Main UI
- `packages/mobile/utils/file-handler.ts` - Upload logic
- `packages/mobile/components/processing-status.tsx` - Status UI

---

## Important Reminders

1. **Always** wrap plugin UI components in `StyledContainer`
2. **Always** use `tw()` for className in plugin
3. **Always** handle file sizes properly in upload flow
4. **Always** implement proper error handling
5. **Always** track token usage for AI calls
6. **Always** test on both platforms (mobile)
7. **Always** validate user input
8. **Always** clean up temporary files
9. **Always** document API changes
10. **Never** commit API keys or secrets

---

## Additional Resources

- Obsidian Plugin API: https://docs.obsidian.md/
- Vercel AI SDK: https://sdk.vercel.ai/docs
- Next.js Documentation: https://nextjs.org/docs
- Expo Documentation: https://docs.expo.dev/
- Drizzle ORM: https://orm.drizzle.team/

---

## Questions to Ask Before Making Changes

1. Does this affect plugin UI? → Use StyledContainer
2. Does this handle file uploads? → Check size limits and flow
3. Does this use AI? → Track tokens and handle errors
4. Does this work offline? → Implement background sync
5. Does this need authentication? → Use Clerk
6. Does this affect mobile? → Test on iOS and Android
7. Does this change the API? → Update documentation
8. Does this touch the database? → Use migrations

---

**Last Updated:** 2025-01-22

**Maintained by:** Note Companion Development Team

**For bugs and issues:** See tutorials/bugs.md
