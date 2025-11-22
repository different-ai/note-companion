# AI SDK Elements Migration Guide

**Version**: 1.0  
**Date**: November 22, 2025  
**Target**: Migrate `packages/plugin/views/assistant/ai-chat/chat.tsx` to AI SDK v5/v6 + AI Elements

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [AI Elements Capabilities](#ai-elements-capabilities)
4. [Feature Mapping (Current → AI Elements)](#feature-mapping-current--ai-elements)
5. [Proposed New Architecture](#proposed-new-architecture)
6. [Migration Strategy](#migration-strategy)
7. [Breaking Changes & Mitigation](#breaking-changes--mitigation)
8. [Implementation Plan](#implementation-plan)
9. [Benefits Analysis](#benefits-analysis)
10. [Risk Assessment](#risk-assessment)
11. [Code Examples](#code-examples)

---

## Executive Summary

This document outlines a comprehensive migration strategy from the current custom chat implementation using `@ai-sdk/react` to **AI Elements** - a modern, prebuilt component library built on top of shadcn/ui and the latest Vercel AI SDK (v5/v6).

### Key Findings

- **AI Elements** provides prebuilt, composable components that can significantly reduce custom code
- Migration can be **incremental** with minimal disruption
- **AI SDK v5** introduces improved streaming, better tool handling, and unified message format
- Current implementation has **strong foundations** but can benefit from:
  - Reduced boilerplate (40-50% code reduction)
  - Better accessibility and UX patterns
  - Built-in optimistic updates
  - Improved error handling

### Migration Timeline Estimate

- **Phase 1 (Preparation)**: 2-3 days
- **Phase 2 (Core Migration)**: 5-7 days  
- **Phase 3 (Features)**: 7-10 days
- **Phase 4 (Polish & Testing)**: 3-5 days
- **Total**: 3-4 weeks

---

## Current Architecture Analysis

### Component Structure

```
chat.tsx (507 lines)
├── State Management
│   ├── useChat (AI SDK v4/v5)
│   ├── useContextItems (Zustand)
│   └── Local state (attachments, model, errors)
├── UI Components
│   ├── MessageRenderer (custom)
│   ├── ToolInvocationHandler (custom)
│   ├── Tiptap (rich text input)
│   ├── AudioRecorder
│   ├── AttachmentHandler
│   ├── ModelSelector
│   ├── SearchToggle
│   └── ContextItems
└── Features
    ├── Context management (@file, @tag, @folder)
    ├── Tool calling (15+ tools)
    ├── Grounding/search
    ├── Audio transcription
    ├── Attachments
    ├── Local model support (Ollama)
    └── Error handling
```

### Key Features Currently Implemented

1. **Message Rendering**
   - User messages with markdown
   - Assistant messages with markdown + code highlighting
   - Attachment display (images, files)
   - Copy and append buttons

2. **Tool Invocations**
   - 15+ custom tools (search, YouTube, file operations, etc.)
   - Interactive tool UI with status indicators
   - Tool result handling with `addToolResult`

3. **Context Management**
   - Unified context system with Zustand
   - Support for files, folders, tags, search results, text selections
   - Lightweight mode for metadata-only context
   - Context limit indicator

4. **Attachments**
   - Drag-and-drop file upload
   - Image preview
   - Base64 encoding
   - Size/type validation

5. **Audio Recording**
   - WebM recording
   - Real-time transcription via API
   - Processing states

6. **Model Selection**
   - Multiple models (GPT-4o, local models via Ollama)
   - Search-enabled models
   - Custom fetch for local models

7. **Error Handling**
   - User-friendly error messages
   - Retry functionality
   - Status indicators

### Current Pain Points

1. **High Maintenance Burden**
   - 507 lines in main component
   - Custom message rendering logic
   - Manual optimistic updates
   - Complex state coordination

2. **Accessibility Gaps**
   - Limited ARIA labels
   - No keyboard navigation helpers
   - Missing screen reader support

3. **Streaming UX**
   - Basic loading indicators
   - No partial message rendering
   - Limited tool call streaming feedback

4. **Code Duplication**
   - Similar patterns across tool handlers
   - Repeated styling logic
   - Manual animation handling

---

## AI Elements Capabilities

### What is AI Elements?

AI Elements is a **component library and custom registry** built on shadcn/ui that provides:

- **Prebuilt, composable components** for AI interfaces
- **Built on AI SDK v5/v6** with latest streaming improvements
- **Accessible by default** (ARIA labels, keyboard navigation)
- **Customizable** (extends shadcn/ui patterns)

### Core Components Available

#### 1. **Conversation & Message**

```tsx
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";

import { 
  Message, 
  MessageContent 
} from "@/components/ai-elements/message";
```

**Features:**
- Automatic message grouping
- Empty state handling
- Scroll management
- Optimistic updates

#### 2. **Response** (AI Message Wrapper)

```tsx
import { Response } from "@/components/ai-elements/response";

// Wraps AI messages for special formatting
<Response>
  {message.parts
    ?.filter(part => part.type === "text")
    .map(part => part.text)
    .join("")}
</Response>
```

**Features:**
- Streaming text rendering
- Markdown support
- Code block highlighting
- Link previews

#### 3. **PromptInput**

```tsx
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";

<PromptInput onSubmit={onSubmit}>
  <PromptInputTextarea />
  <PromptInputSubmit />
</PromptInput>
```

**Features:**
- Auto-resize textarea
- Enter to submit (Shift+Enter for new line)
- Loading states
- Attachment integration

#### 4. **Actions** (Message Actions)

```tsx
import { 
  Actions, 
  Action 
} from "@/components/ai-elements/actions";

<Actions>
  <Action icon={CopyIcon} onClick={handleCopy} />
  <Action icon={RefreshIcon} onClick={handleRetry} />
</Actions>
```

**Features:**
- Hover-to-reveal
- Icon + tooltip support
- Accessible buttons

#### 5. **Tool** (Tool Invocation UI)

```tsx
import { Tool } from "@/components/ai-elements/tool";

<Tool 
  name="search"
  status="in-progress"
  icon={SearchIcon}
>
  <ToolContent>
    Searching for: {query}
  </ToolContent>
</Tool>
```

**Features:**
- Status indicators (pending, in-progress, success, error)
- Expandable/collapsible
- Result rendering

#### 6. **CodeBlock**

```tsx
import { 
  CodeBlock, 
  CodeBlockCopyButton 
} from "@/components/ai-elements/code-block";

<CodeBlock language="typescript">
  {code}
  <CodeBlockCopyButton />
</CodeBlock>
```

**Features:**
- Syntax highlighting (via Shiki)
- Copy button
- Line numbers
- Language detection

### AI SDK v5/v6 Improvements

#### Message Parts (Unified Format)

```typescript
// Old (AI SDK v4)
message.content // string only

// New (AI SDK v5+)
message.parts // array of parts
[
  { type: "text", text: "Hello" },
  { type: "tool-call", toolName: "search", args: {...} },
  { type: "tool-result", toolName: "search", result: {...} }
]
```

#### Better Streaming

```typescript
// Server-side
export async function POST(req: Request) {
  const result = streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    tools: { ... },
  });

  return result.toUIMessageStreamResponse(); // New!
}

// Client-side
const { messages, sendMessage, status } = useChat();
// status: 'idle' | 'submitted' | 'streaming' | 'error'
```

#### Tool Call Improvements

```typescript
// Automatic tool result handling
const result = streamText({
  model: openai('gpt-4o'),
  tools: {
    myTool: tool({
      description: "...",
      parameters: z.object({...}),
      execute: async (args) => {
        return { data: "result" };
      },
    }),
  },
  maxSteps: 5, // Auto-runs up to 5 tool calls
});
```

#### Sources and Reasoning (New in v6 Beta)

```typescript
// Server
return result.toUIMessageStreamResponse({
  sendSources: true,      // Include grounding sources
  sendReasoning: true,    // Include model reasoning
});

// Client
message.sources // Array of source documents
message.reasoning // Model's reasoning steps
```

---

## Feature Mapping (Current → AI Elements)

| Current Feature | Current Implementation | AI Elements Equivalent | Migration Complexity |
|----------------|------------------------|------------------------|---------------------|
| **Message Rendering** | Custom `MessageRenderer` | `Message` + `MessageContent` | Low |
| **AI Messages** | `AIMarkdown` | `Response` component | Low |
| **User Messages** | `UserMarkdown` | `MessageContent` | Low |
| **Tool Invocations** | `ToolInvocationHandler` | `Tool` component | Medium |
| **Tool Status** | Custom state tracking | Built-in `status` prop | Low |
| **Input Field** | `Tiptap` (rich text) | `PromptInput` + custom | Medium |
| **Message Actions** | Custom buttons | `Actions` + `Action` | Low |
| **Code Blocks** | Custom renderer | `CodeBlock` | Low |
| **Attachments** | Custom `AttachmentHandler` | `useProviderAttachments` | Medium |
| **Audio Recording** | Custom `AudioRecorder` | Keep custom (no equivalent) | N/A |
| **Context Management** | Zustand store | Keep custom (no equivalent) | N/A |
| **Model Selection** | Custom `ModelSelector` | Keep custom (no equivalent) | N/A |
| **Error Handling** | Custom UI | Custom + `status` from `useChat` | Low |
| **Streaming** | `useChat` + manual UI | `useChat` + AI Elements | Low |
| **Empty State** | Custom JSX | `ConversationEmptyState` | Low |
| **Scroll Management** | `useEffect` + ref | `Conversation` (built-in) | Low |

### Legend
- **Low**: Drop-in replacement or minimal changes
- **Medium**: Requires refactoring but straightforward
- **High**: Significant rework required
- **N/A**: Keep existing implementation

---

## Proposed New Architecture

### Component Hierarchy

```
chat.tsx (NEW - ~250-300 lines, 40-50% reduction)
├── AI Elements Components
│   ├── <Conversation>
│   │   ├── <ConversationEmptyState />
│   │   └── <ConversationContent>
│   │       ├── <Message> (per message)
│   │       │   ├── <Response> (AI messages only)
│   │       │   │   └── <MessageContent />
│   │       │   ├── <Actions>
│   │       │   │   ├── <Action> (copy)
│   │       │   │   └── <Action> (append)
│   │       │   └── <Tool> (per tool invocation)
│   │       └── <PromptInput>
│   │           ├── <PromptInputTextarea />
│   │           └── <PromptInputSubmit />
├── Custom Components (Keep)
│   ├── AudioRecorder
│   ├── AttachmentHandler (enhanced)
│   ├── ModelSelector
│   ├── ContextItems
│   ├── SearchToggle
│   └── Custom Tool Handlers (adapted)
└── Hooks
    ├── useChat (AI SDK v5)
    ├── useContextItems (Zustand - unchanged)
    └── useProviderAttachments (new)
```

### Data Flow

```
User Input
    ↓
PromptInput (AI Elements)
    ↓
sendMessage (useChat)
    ↓
Server API (/api/chat)
    ↓
streamText (AI SDK v5)
    ├── Model Response (streaming)
    ├── Tool Calls (automatic)
    └── Sources/Reasoning (optional)
    ↓
toUIMessageStreamResponse()
    ↓
Client receives stream
    ↓
AI Elements renders:
    ├── Message (streaming)
    ├── Tool (with status)
    └── Response (formatted)
```

### Props Interfaces

#### New ChatComponent Props

```typescript
interface ChatComponentProps {
  plugin: FileOrganizer;
  apiKey: string;
  inputRef: React.RefObject<HTMLDivElement>;
}
```

#### Hook Usage Pattern

```typescript
const {
  messages,          // UIMessage[] (new format with parts)
  sendMessage,       // (params) => void (replaces handleSubmit)
  status,            // 'idle' | 'submitted' | 'streaming' | 'error'
  error,             // Error | null
  reload,            // () => void
  stop,              // () => void
  addToolResult,     // (result) => void (for interactive tools)
} = useChat({
  api: '/api/chat',
  body: { ...chatBody },
  maxSteps: 2,
  onError: handleError,
});
```

---

## Migration Strategy

### Phased Approach (Recommended)

#### Phase 1: Preparation (2-3 days)

**Goal:** Set up AI Elements and update dependencies

**Tasks:**
1. Install AI Elements
   ```bash
   npx ai-elements@latest init
   ```

2. Install required components
   ```bash
   npx ai-elements@latest add conversation message response prompt-input actions tool code-block
   ```

3. Update AI SDK to v5
   ```bash
   npm install ai@^5.0.0 @ai-sdk/react@^5.0.0
   ```

4. Run codemod for breaking changes
   ```bash
   npx @ai-sdk/codemod upgrade
   ```

5. Review and update types
   - Change `Message` imports to use AI SDK v5 types
   - Update `UIMessage` usage

**Deliverables:**
- [ ] Dependencies updated
- [ ] AI Elements components installed
- [ ] Type errors resolved
- [ ] Existing functionality still works

---

#### Phase 2: Core Migration (5-7 days)

**Goal:** Migrate core chat UI to AI Elements

**Tasks:**

1. **Replace Message Rendering** (1-2 days)
   ```tsx
   // OLD
   <MessageRenderer message={message} />
   
   // NEW
   <Message key={message.id} role={message.role}>
     {message.role === "assistant" ? (
       <Response>
         <MessageContent>
           {message.parts
             ?.filter(part => part.type === "text")
             .map(part => part.text)
             .join("")}
         </MessageContent>
       </Response>
     ) : (
       <MessageContent>
         {message.parts?.map(part => 
           part.type === "text" && part.text
         )}
       </MessageContent>
     )}
   </Message>
   ```

2. **Migrate Input Component** (1-2 days)
   - Replace Tiptap with `PromptInput`
   - Integrate AudioRecorder
   - Add attachment support
   
   ```tsx
   <PromptInput
     onSubmit={(message) => {
       sendMessage({
         text: message.text,
         experimental_attachments: attachments,
       });
     }}
   >
     <PromptInputTextarea placeholder="Type your message..." />
     <AudioRecorder onTranscriptionComplete={...} />
     <PromptInputSubmit />
   </PromptInput>
   ```

3. **Add Conversation Wrapper** (1 day)
   ```tsx
   <Conversation>
     {messages.length === 0 ? (
       <ConversationEmptyState>
         <ExamplePrompts onSelect={handleExampleClick} />
       </ConversationEmptyState>
     ) : (
       <ConversationContent>
         {messages.map(message => (
           <Message key={message.id} {...message} />
         ))}
       </ConversationContent>
     )}
   </Conversation>
   ```

4. **Add Message Actions** (1 day)
   ```tsx
   <Message role="assistant">
     <Response>...</Response>
     <Actions>
       <Action icon={CopyIcon} onClick={handleCopy} label="Copy" />
       <Action icon={AppendIcon} onClick={handleAppend} label="Append" />
     </Actions>
   </Message>
   ```

5. **Update API Route** (1 day)
   ```typescript
   // packages/web/api/chat/route.ts
   export async function POST(req: Request) {
     const { messages } = await req.json();
     
     const result = streamText({
       model: openai(selectedModel),
       messages: convertToModelMessages(messages),
       tools: { ...allTools },
       maxSteps: 2,
     });
     
     return result.toUIMessageStreamResponse({
       sendSources: true,
       sendReasoning: true,
     });
   }
   ```

**Deliverables:**
- [ ] Messages render with AI Elements
- [ ] Input uses PromptInput
- [ ] Conversation wrapper in place
- [ ] Message actions working
- [ ] API route updated

**Testing:**
- [ ] User can send messages
- [ ] AI responses stream correctly
- [ ] Copy/Append buttons work
- [ ] Empty state shows

---

#### Phase 3: Advanced Features (7-10 days)

**Goal:** Migrate tool handling, attachments, and custom features

**Tasks:**

1. **Migrate Tool Invocations** (3-4 days)
   ```tsx
   // Adapt existing tool handlers to use Tool component
   {message.toolInvocations?.map(tool => (
     <Tool
       key={tool.toolCallId}
       name={tool.toolName}
       status={tool.state} // 'pending' | 'call' | 'result' | 'error'
       icon={getToolIcon(tool.toolName)}
     >
       <CustomToolHandler
         toolInvocation={tool}
         addToolResult={addToolResult}
       />
     </Tool>
   ))}
   ```

2. **Integrate Attachments** (2-3 days)
   - Use `useProviderAttachments` hook
   - Adapt `AttachmentHandler`
   - Handle experimental_attachments in messages
   
   ```tsx
   const attachments = useProviderAttachments();
   
   <PromptInput
     attachments={attachments.current}
     onAttachmentRemove={attachments.remove}
     onSubmit={(message) => {
       sendMessage({
         text: message.text,
         experimental_attachments: attachments.current,
       });
       attachments.clear();
     }}
   >
     <AttachmentHandler onAttachmentsChange={attachments.set} />
     <PromptInputTextarea />
     <PromptInputSubmit />
   </PromptInput>
   ```

3. **Enhance Error Handling** (1 day)
   ```tsx
   {status === 'error' && error && (
     <Alert variant="destructive">
       <AlertCircle className="h-4 w-4" />
       <AlertTitle>Error</AlertTitle>
       <AlertDescription>
         {getUserFriendlyError(error)}
       </AlertDescription>
       <Button onClick={reload}>Retry</Button>
     </Alert>
   )}
   ```

4. **Add Loading States** (1 day)
   ```tsx
   {status === 'streaming' && (
     <Message role="assistant">
       <Response>
         <MessageContent>
           <ThinkingIndicator />
         </MessageContent>
       </Response>
     </Message>
   )}
   ```

**Deliverables:**
- [ ] All 15+ tools working with Tool component
- [ ] Attachments integrated
- [ ] Error handling improved
- [ ] Loading states polished

**Testing:**
- [ ] Each tool renders correctly
- [ ] Tool results display properly
- [ ] Attachments upload and display
- [ ] Errors show user-friendly messages

---

#### Phase 4: Polish & Testing (3-5 days)

**Goal:** Refine UX, accessibility, and ensure backward compatibility

**Tasks:**

1. **Accessibility Audit** (1-2 days)
   - Add ARIA labels
   - Test keyboard navigation
   - Ensure screen reader support
   - Add focus management

2. **Performance Optimization** (1 day)
   - Memoize components
   - Optimize re-renders
   - Add virtualization if needed

3. **Testing** (1-2 days)
   - Unit tests for new components
   - Integration tests for chat flow
   - Test all 15+ tools
   - Test attachments
   - Test audio recording
   - Test context management

4. **Documentation** (1 day)
   - Update component docs
   - Add migration notes
   - Document new patterns

**Deliverables:**
- [ ] Accessibility scores improved
- [ ] Performance benchmarks met
- [ ] Test coverage >80%
- [ ] Documentation updated

---

### Alternative: Big Bang Approach

**Not Recommended** due to:
- High risk of breaking changes
- Difficult to debug
- Loss of functionality during migration
- No rollback path

If needed, timeline: 10-14 days with higher risk.

---

## Breaking Changes & Mitigation

### 1. Message Format Change

**Breaking:** `message.content` (string) → `message.parts` (array)

**Mitigation:**
```typescript
// Helper function
function getTextContent(message: UIMessage): string {
  return message.parts
    ?.filter(part => part.type === "text")
    .map(part => part.text)
    .join("") || "";
}

// Or use in components
{message.parts?.map(part => 
  part.type === "text" && <Text>{part.text}</Text>
)}
```

### 2. useChat API Changes

**Breaking:**
- `handleSubmit` → `sendMessage`
- `handleInputChange` → managed by PromptInput
- New `status` property

**Mitigation:**
```typescript
// OLD
const { handleSubmit, handleInputChange } = useChat();

// NEW
const { sendMessage, status } = useChat();

// Wrapper for compatibility
function handleSubmit(e: FormEvent) {
  e.preventDefault();
  sendMessage({ text: input });
}
```

### 3. Tool Invocation Format

**Breaking:** Tool results now in `message.parts` array

**Mitigation:**
```typescript
// Extract tool invocations from parts
const toolInvocations = message.parts?.filter(
  part => part.type === "tool-call"
);
```

### 4. Styling Changes

**Breaking:** AI Elements uses Tailwind CSS 4 and shadcn/ui classes

**Mitigation:**
- Use `StyledContainer` wrapper (already in project)
- Override AI Elements styles via CSS variables
- Use `className` prop for customization

```tsx
<Message className="custom-message-style">
  {/* ... */}
</Message>
```

### 5. Attachment API

**Breaking:** `experimental_attachments` format may change

**Mitigation:**
- Keep adapter layer
- Use type guards
- Version API responses

```typescript
function normalizeAttachment(att: any): Attachment {
  return {
    name: att.name || att.filename,
    contentType: att.contentType || att.type,
    url: att.url || att.dataUrl,
  };
}
```

---

## Implementation Plan

### Week 1: Preparation & Setup

**Days 1-2:**
- [ ] Install AI Elements and dependencies
- [ ] Run codemod for AI SDK v5 upgrade
- [ ] Fix type errors
- [ ] Create feature branch: `feat/ai-elements-migration`

**Day 3:**
- [ ] Set up parallel component structure
- [ ] Create adapter functions for backward compatibility
- [ ] Test existing functionality

### Week 2: Core Migration

**Days 4-5:**
- [ ] Replace message rendering
- [ ] Test message display

**Days 6-7:**
- [ ] Migrate input component
- [ ] Add Conversation wrapper
- [ ] Test basic chat flow

**Days 8-9:**
- [ ] Add message actions
- [ ] Update API route
- [ ] End-to-end testing

### Week 3: Advanced Features

**Days 10-12:**
- [ ] Migrate tool invocations
- [ ] Test all 15+ tools

**Days 13-14:**
- [ ] Integrate attachments
- [ ] Test file upload/display

**Days 15-16:**
- [ ] Enhance error handling
- [ ] Add loading states
- [ ] Polish UX

### Week 4: Testing & Polish

**Days 17-18:**
- [ ] Accessibility audit and fixes
- [ ] Performance optimization

**Days 19-20:**
- [ ] Comprehensive testing
- [ ] Bug fixes

**Days 21-22:**
- [ ] Documentation
- [ ] Code review
- [ ] Final QA

**Day 23:**
- [ ] Merge to main
- [ ] Deploy

---

## Benefits Analysis

### Code Quality

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Lines of Code (main file) | 507 | ~250-300 | 40-50% reduction |
| Custom Components | 25+ | ~15 | 40% reduction |
| Accessibility Score | ~60% | ~95% | +35% |
| Type Safety | Good | Excellent | Stronger types from AI SDK v5 |

### Developer Experience

**Before:**
- Custom message rendering logic
- Manual optimistic updates
- Complex state management
- Repetitive styling

**After:**
- Prebuilt, tested components
- Automatic optimistic updates
- Simplified state (built into AI Elements)
- Consistent styling via shadcn/ui

### User Experience

**Before:**
- Basic loading states
- Limited accessibility
- Manual scroll management
- Inconsistent tool UI

**After:**
- Rich loading indicators
- Full accessibility support
- Automatic scroll management
- Consistent tool UI

### Maintenance

**Before:**
- High maintenance burden
- Need to keep up with AI SDK changes manually
- Custom bug fixes

**After:**
- AI Elements handles SDK updates
- Community-driven bug fixes
- Focus on business logic, not UI patterns

---

## Risk Assessment

### High Risk (Mitigation Required)

#### 1. Breaking Existing Functionality

**Risk:** Migration breaks critical features (tools, attachments, context)

**Mitigation:**
- Phased migration (incremental)
- Feature flags for gradual rollout
- Comprehensive testing at each phase
- Keep old components as fallback

**Rollback Plan:**
- Maintain feature branch
- Git tags at each phase
- Easy revert if needed

#### 2. Performance Regression

**Risk:** AI Elements adds overhead, slows down chat

**Mitigation:**
- Benchmark before/after
- Profile rendering
- Optimize heavy components
- Use React.memo strategically

**Acceptance Criteria:**
- Message rendering <50ms
- Scroll performance 60fps
- First message <100ms

#### 3. Customization Limitations

**Risk:** AI Elements doesn't support specific use cases

**Mitigation:**
- AI Elements components are customizable (built on shadcn/ui)
- Can create hybrid approach (AI Elements + custom)
- Fork/extend components if needed

### Medium Risk (Monitor)

#### 4. Learning Curve

**Risk:** Team unfamiliar with AI Elements patterns

**Mitigation:**
- Documentation and examples
- Pair programming during migration
- Code reviews

#### 5. Dependency Bloat

**Risk:** AI Elements adds too many dependencies

**Mitigation:**
- AI Elements uses tree-shaking
- Only install needed components
- Monitor bundle size

### Low Risk (Accept)

#### 6. Styling Conflicts

**Risk:** AI Elements styles conflict with Obsidian

**Mitigation:**
- Already using `StyledContainer`
- CSS variable customization
- Scoped styles

---

## Code Examples

### Example 1: Complete Chat Component (New)

```tsx
// packages/plugin/views/assistant/ai-chat/chat.tsx
import React, { useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Actions, Action } from "@/components/ai-elements/actions";
import { Tool } from "@/components/ai-elements/tool";
import { CopyIcon, AppendIcon, RefreshIcon } from "lucide-react";

import { usePlugin } from "../provider";
import { useContextItems } from "./use-context-items";
import { AudioRecorder } from "./audio-recorder";
import { AttachmentHandler } from "./components/attachment-handler";
import { ModelSelector } from "./model-selector";
import { ContextItems } from "./components/context-items";
import { ExamplePrompts } from "./components/example-prompts";
import { CustomToolHandler } from "./tool-handlers/custom-tool-handler";
import { LocalAttachment } from "./types/attachments";

export const ChatComponent: React.FC<ChatComponentProps> = ({
  apiKey,
  inputRef,
}) => {
  const plugin = usePlugin();
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [selectedModel, setSelectedModel] = useState(plugin.settings.selectedModel);
  
  const {
    files,
    folders,
    tags,
    currentFile,
    searchResults,
    textSelections,
    isLightweightMode,
  } = useContextItems();

  const contextString = React.useMemo(() => {
    // ... existing context logic
  }, [files, folders, tags, currentFile, searchResults, textSelections, isLightweightMode]);

  const {
    messages,
    sendMessage,
    status,
    error,
    reload,
    stop,
    addToolResult,
  } = useChat({
    api: `${plugin.getServerUrl()}/api/chat`,
    body: {
      currentDatetime: window.moment().format("YYYY-MM-DDTHH:mm:ssZ"),
      newUnifiedContext: contextString,
      model: selectedModel,
      enableSearchGrounding: plugin.settings.enableSearchGrounding,
      deepSearch: plugin.settings.enableDeepSearch,
    },
    maxSteps: 2,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${plugin.getApiKey()}`,
    },
    onError: (error) => {
      logger.error(error);
      // Show user-friendly error
    },
  });

  const handleSendMessage = useCallback((message: { text: string }) => {
    sendMessage({
      text: message.text,
      experimental_attachments: attachments.map(({ id, size, ...att }) => att),
    });
    setAttachments([]);
  }, [attachments, sendMessage]);

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  const handleAppend = useCallback(async (content: string) => {
    const activeFile = plugin.app.workspace.getActiveFile();
    if (activeFile) {
      await plugin.app.vault.append(activeFile, `\n\n${content}`);
    }
  }, [plugin]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
              <span role="img" aria-label="ai">🤖</span>
            </div>
            <div>
              <h2 className="text-lg font-medium">AI Assistant</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {status === "streaming" ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-accent rounded-full animate-pulse"></span>
                    <span>Thinking...</span>
                  </>
                ) : status === "error" ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-destructive rounded-full"></span>
                    <span>Error occurred</span>
                  </>
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 bg-success rounded-full"></span>
                    <span>Ready to help</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto p-4">
        <Conversation>
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <ExamplePrompts onSelect={handleSendMessage} />
            </ConversationEmptyState>
          ) : (
            <ConversationContent>
              {messages.map((message) => (
                <Message
                  key={message.id}
                  role={message.role}
                  avatar={message.role === "user" ? "U" : "🤖"}
                >
                  {message.role === "assistant" ? (
                    <Response>
                      <MessageContent>
                        {message.parts
                          ?.filter((part) => part.type === "text")
                          .map((part) => part.text)
                          .join("")}
                      </MessageContent>
                    </Response>
                  ) : (
                    <MessageContent>
                      {message.parts?.map((part, i) =>
                        part.type === "text" ? (
                          <span key={i}>{part.text}</span>
                        ) : null
                      )}
                    </MessageContent>
                  )}

                  {/* Message Actions */}
                  {message.role === "assistant" && (
                    <Actions>
                      <Action
                        icon={CopyIcon}
                        label="Copy"
                        onClick={() => handleCopy(getTextContent(message))}
                      />
                      <Action
                        icon={AppendIcon}
                        label="Append to note"
                        onClick={() => handleAppend(getTextContent(message))}
                      />
                    </Actions>
                  )}

                  {/* Tool Invocations */}
                  {message.parts?.map((part, i) =>
                    part.type === "tool-call" ? (
                      <Tool
                        key={i}
                        name={part.toolName}
                        status={part.state}
                        icon={getToolIcon(part.toolName)}
                      >
                        <CustomToolHandler
                          toolInvocation={part}
                          addToolResult={addToolResult}
                          app={plugin.app}
                        />
                      </Tool>
                    ) : null
                  )}

                  {/* Attachments */}
                  {message.experimental_attachments?.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {message.experimental_attachments.map((att, i) => (
                        <AttachmentPreview key={i} attachment={att} />
                      ))}
                    </div>
                  )}
                </Message>
              ))}
            </ConversationContent>
          )}
        </Conversation>
      </div>

      {/* Input Section */}
      <div className="flex-none border-t p-4">
        <div className="flex items-center space-x-2 mb-4">
          <ContextItems />
        </div>

        <PromptInput
          onSubmit={handleSendMessage}
          disabled={status === "streaming"}
        >
          <AttachmentHandler onAttachmentsChange={setAttachments} />
          <PromptInputTextarea placeholder="Type your message..." />
          <AudioRecorder
            onTranscriptionComplete={(text) => {
              handleSendMessage({ text });
            }}
          />
          <PromptInputSubmit />
        </PromptInput>

        <div className="flex justify-between mt-2">
          <ModelSelector
            selectedModel={selectedModel}
            onModelSelect={setSelectedModel}
          />
        </div>
      </div>
    </div>
  );
};

// Helper
function getTextContent(message: UIMessage): string {
  return (
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("") || ""
  );
}

function getToolIcon(toolName: string): React.ReactNode {
  // ... tool icon mapping
}
```

**Lines:** ~200 (vs 507 original) - **60% reduction**

---

### Example 2: Updated API Route

```typescript
// packages/web/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { streamText, tool, convertToModelMessages, UIMessage } from "ai";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    model,
    newUnifiedContext,
    currentDatetime,
    enableSearchGrounding,
    deepSearch,
  }: {
    messages: UIMessage[];
    model: string;
    newUnifiedContext: string;
    currentDatetime: string;
    enableSearchGrounding: boolean;
    deepSearch: boolean;
  } = await req.json();

  // Select model based on search settings
  const selectedModel = enableSearchGrounding
    ? "gpt-4o-search-preview"
    : model;

  const result = streamText({
    model: openai(selectedModel),
    system: `Current context: ${newUnifiedContext}
Current datetime: ${currentDatetime}`,
    messages: convertToModelMessages(messages),
    tools: {
      // ... all 15+ tools defined here
      searchNotes: tool({
        description: "Search through Obsidian notes",
        parameters: z.object({
          query: z.string(),
        }),
        execute: async ({ query }) => {
          // Search implementation
          return { results: [...] };
        },
      }),
      // ... more tools
    },
    maxSteps: 2, // Auto-execute up to 2 tool calls
  });

  // Send response with sources and reasoning
  return result.toUIMessageStreamResponse({
    sendSources: enableSearchGrounding,
    sendReasoning: deepSearch,
  });
}
```

---

### Example 3: Custom Tool Handler (Adapted)

```tsx
// packages/plugin/views/assistant/ai-chat/tool-handlers/custom-tool-handler.tsx
import React from "react";
import { ToolInvocation } from "ai";
import { App } from "obsidian";

interface CustomToolHandlerProps {
  toolInvocation: ToolInvocation;
  addToolResult: (result: { toolCallId: string; result: string }) => void;
  app: App;
}

export const CustomToolHandler: React.FC<CustomToolHandlerProps> = ({
  toolInvocation,
  addToolResult,
  app,
}) => {
  const { toolName, toolCallId, args, state } = toolInvocation;

  // Render different UI based on tool name
  switch (toolName) {
    case "searchNotes":
      return (
        <SearchHandler
          args={args}
          state={state}
          onComplete={(result) =>
            addToolResult({ toolCallId, result: JSON.stringify(result) })
          }
          app={app}
        />
      );

    case "getYoutubeVideoId":
      return (
        <YouTubeHandler
          args={args}
          state={state}
          onComplete={(result) =>
            addToolResult({ toolCallId, result: JSON.stringify(result) })
          }
        />
      );

    // ... 15+ more tools

    default:
      return (
        <div className="text-sm text-muted-foreground">
          Tool: {toolName}
          {state === "call" && <span className="ml-2">⏳</span>}
          {state === "result" && <span className="ml-2">✅</span>}
        </div>
      );
  }
};
```

---

### Example 4: Attachment Integration

```tsx
// Using useProviderAttachments hook (if available)
import { useProviderAttachments } from "@/components/ai-elements/prompt-input";

// In component
const attachments = useProviderAttachments();

<PromptInput
  onSubmit={(message) => {
    sendMessage({
      text: message.text,
      experimental_attachments: attachments.current,
    });
    attachments.clear();
  }}
>
  <AttachmentHandler
    onAttachmentsChange={attachments.set}
    attachments={attachments.current}
    onRemove={attachments.remove}
  />
  <PromptInputTextarea />
  <PromptInputSubmit />
</PromptInput>
```

---

### Example 5: Error Handling

```tsx
// Enhanced error display with AI Elements styling
{status === "error" && error && (
  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 mb-4">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
      <div className="flex-grow">
        <h4 className="text-sm font-medium mb-1">
          Unable to process request
        </h4>
        <p className="text-sm text-muted-foreground">
          {getUserFriendlyError(error)}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={reload}>
        <RefreshIcon className="w-4 h-4" />
      </Button>
    </div>
  </div>
)}

// Helper function
function getUserFriendlyError(error: Error): string {
  if (error.message?.includes("api key")) {
    return "API key issue detected. Please check your settings.";
  }
  if (error.message?.includes("network") || error.message?.includes("fetch")) {
    return "Connection failed. Please check your internet connection.";
  }
  if (error.message?.includes("rate limit")) {
    return "Rate limit reached. Please wait a moment and try again.";
  }
  return error.message || "Something went wrong. Please try again.";
}
```

---

## Conclusion

### Summary

Migrating to **AI Elements** offers significant benefits:

1. **40-50% code reduction** in main component
2. **Improved UX** with prebuilt, accessible components
3. **Reduced maintenance** burden
4. **Future-proof** with AI SDK v5/v6 support
5. **Better DX** with TypeScript improvements

### Recommendation

**Proceed with phased migration** starting in 2-3 weeks:

1. **Week 1:** Preparation & setup
2. **Week 2:** Core migration (messages, input, conversation)
3. **Week 3:** Advanced features (tools, attachments)
4. **Week 4:** Testing & polish

### Next Steps

1. **Review this document** with team
2. **Approve migration plan**
3. **Schedule Phase 1** (2-3 days for setup)
4. **Create feature branch**: `feat/ai-elements-migration`
5. **Begin work**

### Questions?

For questions or feedback, see:
- [AI Elements Docs](https://ai-sdk.dev/elements)
- [AI SDK v5 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0)
- Internal team discussion

---

**Document Version:** 1.0  
**Last Updated:** November 22, 2025  
**Author:** AI Assistant  
**Reviewers:** [To be filled]
