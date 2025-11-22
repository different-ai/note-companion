# AI SDK Elements Migration - Extended Implementation Report

**Version**: 2.0 (Extended Analysis)  
**Date**: November 22, 2025  
**Target**: Deep architectural analysis and incremental migration strategy for Note Companion

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Architecture Analysis](#critical-architecture-analysis)
3. [Breaking Point Analysis](#breaking-point-analysis)
4. [Incremental Adoption Strategy](#incremental-adoption-strategy)
5. [Risk Mitigation Matrix](#risk-mitigation-matrix)
6. [Dependencies and Integration Points](#dependencies-and-integration-points)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Procedures](#rollback-procedures)

---

## Executive Summary

### Current State Analysis

After deep architectural review of `packages/web/app/api/(newai)/chat/route.ts` and `packages/plugin/views/assistant/ai-chat/chat.tsx`, the migration presents **MODERATE-HIGH complexity** due to:

1. **Custom Streaming Implementation**: Uses `createDataStreamResponse` with `mergeIntoDataStream` (AI SDK v4/v5 pattern)
2. **Obsidian Plugin Environment**: React components running inside Obsidian's plugin sandbox
3. **Hybrid Fetch Strategy**: Dual model support (cloud GPT-4 + local Ollama)
4. **Custom Tool System**: 15+ tools with interactive UI via `ToolInvocationHandler`
5. **Context Management**: Complex Zustand-based context system with lightweight mode
6. **Attachment Handling**: Custom `LocalAttachment` system with preview

### Key Finding: AI Elements May Not Be Compatible

⚠️ **CRITICAL DISCOVERY**: AI Elements is designed for **Next.js + React** web applications. The Note Companion plugin runs in **Obsidian's plugin environment**, which has fundamentally different constraints:

- Obsidian plugins use a **custom build process** (esbuild, not Next.js)
- Limited npm package compatibility (many Next.js-specific packages fail)
- **No server-side rendering** (Obsidian is a desktop app)
- Custom CSS isolation requirements (`StyledContainer` wrapper)

**Recommendation**: Focus migration effort on **server-side API route updates** while keeping custom plugin UI components.

---

## Critical Architecture Analysis

### 1. Current Server Implementation (packages/web/app/api/(newai)/chat/route.ts)

**Lines of Code**: 144  
**Complexity**: Medium-High

#### Current Streaming Pattern
```typescript
export async function POST(req: NextRequest) {
  return createDataStreamResponse({
    execute: async (dataStream) => {
      // Auth
      const { userId } = await handleAuthorizationV2(req);
      const { messages, newUnifiedContext, ... } = await req.json();

      // Stream initialization
      dataStream.writeData("initialized call");

      // Model selection
      if (enableSearchGrounding) {
        const result = await streamText({
          model: openai.responses("gpt-4o-mini"),
          system: getChatSystemPrompt(...),
          maxSteps: 3,
          messages,
          tools: { web_search_preview: ... },
          onFinish: async ({ usage, sources }) => {
            // Write annotations
            dataStream.writeMessageAnnotation({
              type: "search-results",
              citations,
            });
            await incrementAndLogTokenUsage(userId, usage.totalTokens);
            dataStream.writeData("call completed");
          },
        });
        result.mergeIntoDataStream(dataStream);
      } else {
        // Standard model flow
        const result = await streamText({...});
        result.mergeIntoDataStream(dataStream);
      }
    },
    onError: (error) => { ... },
  });
}
```

#### What Would Break

1. **`createDataStreamResponse` → `toUIMessageStreamResponse`**
   - **Breaking**: Complete signature change
   - **Impact**: Loss of custom `dataStream.writeData()` calls
   - **Impact**: Loss of `dataStream.writeMessageAnnotation()` for citations
   - **Mitigation**: Need to migrate to AI SDK v6 patterns

2. **`mergeIntoDataStream` → Native streaming**
   - **Breaking**: Method doesn't exist in AI SDK v6
   - **Impact**: Need to rethink how stream merging works
   - **Mitigation**: Use AI SDK v6's `toUIMessageStreamResponse()` which handles streaming natively

3. **Custom tool registration**
   - **Current**: Tools defined in separate `chatTools` object
   - **Migration**: Need to convert to AI SDK v5+ `tool()` format with `execute` functions
   - **Impact**: All 12+ tools need refactoring

### 2. Current Client Implementation (packages/plugin/views/assistant/ai-chat/chat.tsx)

**Lines of Code**: 506  
**Complexity**: High

#### Current `useChat` Configuration
```typescript
const {
  isLoading: isGenerating,
  messages,
  input,
  handleInputChange,
  handleSubmit,
  stop,
  addToolResult,
  error,
  reload,
} = useChat({
  onDataChunk: (chunk: DataChunk) => {
    if (chunk.type === "metadata" && chunk.data?.groundingMetadata) {
      setGroundingMetadata(chunk.data.groundingMetadata);
    }
  },
  maxSteps: 2,
  api: `${plugin.getServerUrl()}/api/chat`,
  experimental_throttle: 100,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${plugin.getApiKey()}`,
  },
  fetch: async (url, options) => {
    // CUSTOM FETCH LOGIC for Ollama local models
    if (selectedModel === "llama3.2") {
      const result = await streamText({
        model: ollama(selectedModel),
        system: `...`,
        messages: convertToCoreMessages(messages),
      });
      return result.toDataStreamResponse();
    }
    return fetch(url, options);
  },
  onToolCall({ toolCall }) { ... },
  keepLastMessageOnError: true,
  onError: error => { ... },
  onFinish: () => { ... },
} as UseChatOptions);
```

#### What Would Break

1. **`onDataChunk` → Removed in AI SDK v6**
   - **Breaking**: Citation data currently comes via `onDataChunk`
   - **Impact**: `groundingMetadata` state won't update
   - **Mitigation**: Use `message.annotations` or `message.metadata` in AI SDK v6

2. **`handleSubmit` → `sendMessage`**
   - **Breaking**: API signature change
   - **Impact**: All form submission logic needs updating
   - **Current**: `handleSubmit(e, { body: messageBody })`
   - **New**: `sendMessage({ text, experimental_attachments })`

3. **`handleInputChange` → Managed by PromptInput**
   - **Breaking**: Manual input state management goes away
   - **Impact**: Custom Tiptap integration will conflict
   - **Mitigation**: Keep Tiptap OR migrate to PromptInput (can't have both)

4. **Custom `fetch` function**
   - **Breaking**: `fetch` option behavior changes in AI SDK v6
   - **Impact**: Local Ollama model routing logic needs redesign
   - **Mitigation**: Implement model routing on server-side instead

### 3. Tool Invocation System

**Critical Dependency**: The entire tool system is tightly coupled to message structure.

#### Current Tool Flow
```typescript
// Server defines tools
export const chatTools = {
  getSearchQuery: {
    description: "...",
    parameters: z.object({ query: z.string() }),
  },
  // ... 11 more tools
}

// Client renders tool invocations
{message.toolInvocations?.map((toolInvocation: ToolInvocation) => (
  <ToolInvocationHandler
    key={toolInvocation.toolCallId}
    toolInvocation={toolInvocation}
    addToolResult={addToolResult}
    app={app}
  />
))}
```

#### What Would Break

1. **Tool Definition Format**
   - **Current**: Zod schema only (no `execute`)
   - **New AI SDK v5+**: Requires `execute` function
   ```typescript
   // OLD (current)
   getSearchQuery: {
     description: "...",
     parameters: z.object({ query: z.string() }),
   }
   
   // NEW (AI SDK v5+)
   getSearchQuery: tool({
     description: "...",
     parameters: z.object({ query: z.string() }),
     execute: async ({ query }) => {
       return await searchNotes(query);
     },
   })
   ```

2. **Tool Invocation Structure**
   - **Current**: `message.toolInvocations` array
   - **New AI SDK v6**: `message.parts` array with `{ type: "tool-call" }`
   - **Impact**: All `ToolInvocationHandler` logic needs rewrite

3. **Interactive Tool Results**
   - **Current**: `addToolResult()` for user confirmation
   - **New**: Needs migration to AI SDK v6 tool result patterns
   - **Risk**: User confirmation flows may not work the same way

---

## Breaking Point Analysis

### Compatibility Matrix

| Component | AI SDK v4 | AI SDK v5 | AI SDK v6 | AI Elements | Obsidian Plugin |
|-----------|-----------|-----------|-----------|-------------|-----------------|
| `useChat` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `streamText` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `createDataStreamResponse` | ✅ | ✅ | ❌ (deprecated) | ❌ | ✅ |
| `toUIMessageStreamResponse` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `mergeIntoDataStream` | ✅ | ✅ | ❌ (removed) | ❌ | ✅ |
| AI Elements Components | ❌ | ❌ | ❌ | ✅ | ⚠️ (incompatible) |
| `message.content` | ✅ | ⚠️ (deprecated) | ❌ | ❌ | ✅ (current) |
| `message.parts` | ❌ | ✅ | ✅ | ✅ | ❌ (not used) |
| `onDataChunk` | ✅ | ✅ | ❌ (removed) | ❌ | ✅ (critical) |
| `handleSubmit` | ✅ | ✅ | ⚠️ (deprecated) | ❌ | ✅ (current) |
| `sendMessage` | ❌ | ✅ | ✅ | ✅ | ❌ (not used) |

### Critical Incompatibilities

#### 1. AI Elements in Obsidian Plugin Environment
**Severity**: 🔴 **CRITICAL**

```typescript
// AI Elements expects Next.js environment
import { Conversation } from "@/components/ai-elements/conversation";

// Problem 1: Path aliases (@/) may not resolve in Obsidian plugin build
// Problem 2: AI Elements imports shadcn/ui components
// Problem 3: shadcn/ui expects Tailwind CSS with specific config
// Problem 4: Obsidian plugins have custom CSS scoping (StyledContainer)
```

**Actual Error You'll Get**:
```
Error: Cannot find module '@/components/ai-elements/conversation'
OR
Error: Module not found: @radix-ui/react-slot
OR
CSS conflicts: Tailwind classes not applying due to Obsidian CSS scope
```

**Why It Fails**:
- AI Elements uses `@/` path alias (needs `tsconfig.json` paths config)
- Obsidian plugin bundler (esbuild) doesn't handle path aliases the same way
- AI Elements dependencies (shadcn/ui, Radix UI) expect DOM environment
- Obsidian's CSS isolation breaks Tailwind utility classes

**Verdict**: ❌ **AI Elements CANNOT be used in Obsidian plugin** without major build system changes.

#### 2. Message Format Change (`content` → `parts`)
**Severity**: 🟠 **HIGH**

Current code has 20+ locations accessing `message.content`:
```typescript
// Current (will break)
{message.content} // undefined in AI SDK v6

// Need to change to
{message.parts?.filter(p => p.type === "text").map(p => p.text).join("")}
```

**Impact**: Every message renderer needs updating.

#### 3. Tool Invocation Access Pattern
**Severity**: 🟠 **HIGH**

Current code accesses tools via `message.toolInvocations`:
```typescript
// Current (will break)
{message.toolInvocations?.map((tool) => ...)}

// Need to change to
{message.parts?.filter(p => p.type === "tool-call").map((tool) => ...)}
```

**Impact**: All 15+ tool handlers need updating.

#### 4. Citation/Annotation System
**Severity**: 🟡 **MEDIUM**

Current code uses `onDataChunk` for citations:
```typescript
// Current (will break)
onDataChunk: (chunk: DataChunk) => {
  if (chunk.type === "metadata" && chunk.data?.groundingMetadata) {
    setGroundingMetadata(chunk.data.groundingMetadata);
  }
}

// Need to change to
// Access via message.annotations or message.metadata
```

**Impact**: Citation display system needs redesign.

---

## Incremental Adoption Strategy

### Revised Approach: Server-Only Migration

Given AI Elements incompatibility with Obsidian plugins, the strategy shifts to:

**PHASE 1: Server-Side API Modernization (SAFE)**
**PHASE 2: Plugin Message Format Migration (RISKY)**  
**PHASE 3: Keep Custom Plugin UI (RECOMMENDED)**

### Phase 1: Server-Side API Modernization (Week 1-2)

#### Step 1.1: Update API Route Streaming Pattern

**File**: `packages/web/app/api/(newai)/chat/route.ts`

**Current**:
```typescript
return createDataStreamResponse({
  execute: async (dataStream) => {
    const result = await streamText({...});
    result.mergeIntoDataStream(dataStream);
  },
});
```

**Migrate To**:
```typescript
export async function POST(req: NextRequest) {
  const { userId } = await handleAuthorizationV2(req);
  const { messages, newUnifiedContext, ... } = await req.json();

  const result = streamText({
    model: getModel(chosenModelName),
    system: getChatSystemPrompt(contextString, currentDatetime),
    messages: convertToModelMessages(messages), // NEW function
    maxSteps: 3,
    tools: chatToolsV5, // Migrated tools
    onFinish: async ({ usage, sources }) => {
      await incrementAndLogTokenUsage(userId, usage.totalTokens);
      // Sources now handled automatically in response
    },
  });

  // NEW: Use AI SDK v5 response format
  return result.toUIMessageStreamResponse({
    sendSources: true, // Replaces manual citation writing
    sendReasoning: false,
  });
}
```

**Testing**:
```bash
# Test endpoint directly
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "test"}]}'
```

**Rollback**:
- Keep `route.ts.backup` copy
- Git tag: `api-migration-step-1`
- Can revert single file without affecting plugin

#### Step 1.2: Migrate Tool Definitions

**File**: `packages/web/app/api/(newai)/chat/tools.ts`

**Current**:
```typescript
export const chatTools = {
  getSearchQuery: {
    description: "...",
    parameters: z.object({ query: z.string() }),
  },
}
```

**Migrate To**:
```typescript
import { tool } from 'ai';

export const chatToolsV5 = {
  getSearchQuery: tool({
    description: "Extract semantic search queries",
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }, { toolCallId }) => {
      // Tool logic here (moved from client)
      const results = await searchVaultNotes(query);
      return { results };
    },
  }),
  // ... migrate all 12 tools
}
```

**Impact**: 
- Server now handles tool execution (more secure)
- Client becomes display-only (simpler)
- Reduces client bundle size

**Testing**:
- Each tool needs individual test
- Verify `addToolResult` still works for interactive tools

#### Step 1.3: Add Backward Compatibility Layer

**File**: `packages/web/app/api/(newai)/chat/route-adapter.ts` (NEW)

```typescript
/**
 * Adapter to maintain compatibility with old plugin clients
 * while using new AI SDK v5 server code
 */
export function convertToModelMessages(messages: UIMessage[]): ModelMessage[] {
  return messages.map(msg => {
    // Handle old format (message.content string)
    if (typeof msg.content === 'string') {
      return {
        role: msg.role,
        content: msg.content,
      };
    }
    
    // Handle new format (message.parts array)
    return {
      role: msg.role,
      content: msg.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || '',
    };
  });
}

export function convertToUIMessageStream(stream: AsyncIterable) {
  // Convert new stream format to old format for plugin compatibility
  // This allows gradual migration
}
```

**Benefit**: Server can use AI SDK v5 while plugin stays on v4.

### Phase 2: Plugin Message Format Migration (Week 3-4)

**⚠️ DANGER ZONE**: This phase has highest risk of breaking the plugin.

#### Step 2.1: Add Message Parts Support (Parallel Implementation)

**Strategy**: Support BOTH formats simultaneously during transition.

**File**: `packages/plugin/views/assistant/ai-chat/message-renderer.tsx` (NEW)

```typescript
import { Message as SDKMessage } from 'ai';

interface MessageRendererProps {
  message: SDKMessage;
}

export function MessageRenderer({ message }: MessageRendererProps) {
  // Helper: Extract text from both old and new formats
  const getTextContent = (msg: SDKMessage): string => {
    // New format (AI SDK v5+)
    if (msg.parts) {
      return msg.parts
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join('');
    }
    
    // Old format (backward compatibility)
    if (typeof msg.content === 'string') {
      return msg.content;
    }
    
    return '';
  };

  const textContent = getTextContent(message);
  
  return (
    <div className="message">
      <AIMarkdown content={textContent} />
      {/* Tool invocations handled separately */}
    </div>
  );
}
```

**Testing**:
1. Test with messages from old API (content string)
2. Test with messages from new API (parts array)
3. Verify both work

#### Step 2.2: Migrate Tool Invocation Rendering

**File**: `packages/plugin/views/assistant/ai-chat/tool-handlers/tool-invocation-handler.tsx`

**Current**:
```typescript
{message.toolInvocations?.map((tool) => (
  <ToolInvocationHandler toolInvocation={tool} />
))}
```

**Migrate To**:
```typescript
// Helper function
const getToolInvocations = (message: SDKMessage) => {
  // New format (AI SDK v5+)
  if (message.parts) {
    return message.parts.filter(part => part.type === 'tool-call');
  }
  
  // Old format (backward compatibility)
  return message.toolInvocations || [];
};

// Usage
{getToolInvocations(message).map((tool) => (
  <ToolInvocationHandler toolInvocation={tool} />
))}
```

**Testing**:
- Test each of 15+ tools individually
- Verify interactive tools still allow user confirmation
- Check tool result display

#### Step 2.3: Update `useChat` Configuration

**File**: `packages/plugin/views/assistant/ai-chat/chat.tsx`

**Current**:
```typescript
const { handleSubmit, handleInputChange, ... } = useChat({
  onDataChunk: (chunk) => { ... },
});
```

**Migrate To**:
```typescript
const { sendMessage, status, ... } = useChat({
  // onDataChunk removed - use message.annotations instead
  onFinish: ({ message }) => {
    // Access citations via message.annotations
    const citations = message.annotations?.filter(a => a.type === 'search-results');
    if (citations) {
      setGroundingMetadata(citations);
    }
  },
});

// Update form submission
const handleSendMessage = (e: React.FormEvent) => {
  e.preventDefault();
  sendMessage({
    text: input,
    experimental_attachments: attachments,
  });
};
```

**Testing**:
- Verify citations still display
- Test attachment uploads
- Check error handling

### Phase 3: Keep Custom Plugin UI (Recommended)

**Decision**: Do NOT migrate to AI Elements due to Obsidian incompatibility.

**Instead**:
1. ✅ Keep custom `MessageRenderer` with `AIMarkdown`
2. ✅ Keep custom `Tiptap` input (works in Obsidian)
3. ✅ Keep custom `ToolInvocationHandler` (fully functional)
4. ✅ Keep `StyledContainer` wrapper (required for Obsidian)

**Rationale**:
- Current UI works well and is proven stable
- AI Elements requires Next.js (not compatible)
- Custom components are already optimized for Obsidian
- Migration risk outweighs benefits

**Improvements Without AI Elements**:
- ✅ Update message format to use `parts`
- ✅ Modernize API to AI SDK v5
- ✅ Improve accessibility (add ARIA labels manually)
- ✅ Keep code reduction from tool migration

---

## Risk Mitigation Matrix

### High-Risk Components

| Component | Risk Level | Impact | Mitigation | Rollback Time |
|-----------|------------|--------|------------|---------------|
| API Route | 🟠 HIGH | Chat breaks entirely | Parallel API route `/api/chat-v5` | 5 minutes |
| Tool Definitions | 🟠 HIGH | All tools fail | Feature flag for v4/v5 tools | 10 minutes |
| `useChat` config | 🔴 CRITICAL | Plugin crashes | Gradual migration with adapter | 15 minutes |
| Message Rendering | 🟡 MEDIUM | Display issues | Support both formats | 5 minutes |
| Citations | 🟡 MEDIUM | No search results | Fallback to old system | 10 minutes |

### Mitigation Strategies

#### 1. Parallel API Routes

Run both old and new APIs simultaneously:
```typescript
// packages/web/app/api/chat/route.ts (OLD - keep running)
export async function POST() {
  return createDataStreamResponse({...});
}

// packages/web/app/api/chat-v5/route.ts (NEW - test here)
export async function POST() {
  return result.toUIMessageStreamResponse({...});
}
```

Switch via environment variable:
```typescript
// Plugin
const apiEndpoint = process.env.USE_CHAT_V5 
  ? '/api/chat-v5' 
  : '/api/chat';
```

#### 2. Feature Flags

```typescript
// packages/plugin/settings.ts
interface FileOrganizerSettings {
  // ... existing settings
  enableAISDKv5: boolean; // NEW
}

// Usage
const toolsDefinition = plugin.settings.enableAISDKv5 
  ? chatToolsV5 
  : chatToolsV4;
```

#### 3. Message Format Adapter

```typescript
// packages/plugin/lib/message-adapter.ts
export function adaptMessage(message: any): SDKMessage {
  return {
    ...message,
    parts: message.parts || [
      { type: 'text', text: message.content || '' }
    ],
  };
}

// Usage
const adaptedMessages = messages.map(adaptMessage);
```

#### 4. Gradual Rollout

```typescript
// Roll out to percentage of users
const shouldUseV5 = Math.random() < 0.1; // 10% of users

if (shouldUseV5) {
  return '/api/chat-v5';
}
return '/api/chat';
```

---

## Testing Strategy

### Test Levels

#### 1. Unit Tests
```typescript
// packages/web/app/api/(newai)/chat/route.test.ts
describe('Chat API v5', () => {
  it('should stream responses', async () => {
    const response = await POST(mockRequest);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
  });

  it('should handle tool calls', async () => {
    const response = await POST(mockRequestWithTools);
    // Verify tool execution
  });

  it('should send citations', async () => {
    const response = await POST(mockRequestWithSearch);
    // Verify sources in stream
  });
});
```

#### 2. Integration Tests
```typescript
// packages/plugin/views/assistant/ai-chat/__tests__/chat.test.tsx
describe('Chat Component', () => {
  it('should render messages with parts', () => {
    const mockMessages = [{
      id: '1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Hello' }],
    }];
    
    render(<ChatComponent messages={mockMessages} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle both old and new message formats', () => {
    // Test backward compatibility
  });
});
```

#### 3. E2E Tests
```typescript
// e2e/chat.spec.ts (Playwright)
test('complete chat flow', async ({ page }) => {
  await page.goto('/');
  
  // Send message
  await page.fill('[data-testid="chat-input"]', 'Test message');
  await page.click('[data-testid="send-button"]');
  
  // Wait for streaming response
  await page.waitForSelector('[data-testid="assistant-message"]');
  
  // Verify message displayed
  const response = await page.textContent('[data-testid="assistant-message"]');
  expect(response).toBeTruthy();
});

test('tool invocation flow', async ({ page }) => {
  await page.fill('[data-testid="chat-input"]', 'Search for test');
  await page.click('[data-testid="send-button"]');
  
  // Verify tool UI appears
  await page.waitForSelector('[data-testid="tool-invocation"]');
  
  // Verify tool result
  await page.waitForSelector('[data-testid="tool-result"]');
});
```

### Manual Testing Checklist

**Pre-Migration**:
- [ ] Record baseline metrics (response time, memory usage)
- [ ] Screenshot current UI for visual comparison
- [ ] Document current tool behaviors
- [ ] Export test conversation history

**During Migration**:
- [ ] Test with 5-10 simple messages
- [ ] Test with code generation (markdown)
- [ ] Test all 15+ tools individually
- [ ] Test attachments (image upload)
- [ ] Test audio transcription
- [ ] Test citations/search grounding
- [ ] Test error scenarios (network failure, rate limit)
- [ ] Test local Ollama models
- [ ] Test context management (file, folder, tag)

**Post-Migration**:
- [ ] Compare response times
- [ ] Check for memory leaks
- [ ] Verify all tools still work
- [ ] Test on different Obsidian versions

---

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

#### Server Rollback
```bash
# Revert API route
git checkout HEAD~1 packages/web/app/api/(newai)/chat/route.ts
git checkout HEAD~1 packages/web/app/api/(newai)/chat/tools.ts

# Restart server
pnpm -F web dev
```

#### Plugin Rollback
```bash
# Revert plugin code
git checkout HEAD~1 packages/plugin/views/assistant/ai-chat/chat.tsx

# Rebuild plugin
pnpm -F plugin build
```

### Partial Rollback (Keep Some Changes)

#### Rollback Only API, Keep Plugin Updates
```bash
# Revert API but keep plugin improvements
git checkout HEAD~1 packages/web/app/api/(newai)/chat/route.ts

# Plugin continues working with old API
# No rebuild needed
```

#### Rollback Only Plugin, Keep API Updates
```bash
# Use adapter to make new API work with old plugin
# Add compatibility layer in route-adapter.ts
```

### Database Rollback

No database changes in this migration, so no DB rollback needed.

### Feature Flag Rollback

```typescript
// Instant rollback via settings
plugin.settings.enableAISDKv5 = false;
await plugin.saveSettings();
```

---

## Conclusion

### Recommended Migration Path

**✅ DO**:
1. Migrate server API to AI SDK v5 (`toUIMessageStreamResponse`)
2. Update tool definitions to use `tool()` helper with `execute`
3. Add message format adapter for backward compatibility
4. Support both `message.content` and `message.parts` during transition
5. Incrementally migrate plugin to use `message.parts`

**❌ DO NOT**:
1. Attempt to use AI Elements in Obsidian plugin (incompatible)
2. Do "big bang" migration (too risky)
3. Remove backward compatibility too early
4. Skip testing phase

### Timeline Estimate (Revised)

- **Week 1-2**: Server API migration + testing (SAFE)
- **Week 3**: Plugin message format migration (RISKY - needs heavy testing)
- **Week 4**: Cleanup + polish + remove backward compatibility
- **Total**: 4 weeks (more conservative than original 3-4 weeks)

### Success Metrics

- ✅ All 15+ tools work correctly
- ✅ Citations/search grounding still displays
- ✅ Response time ≤ baseline (no performance regression)
- ✅ No increase in error rate
- ✅ Attachment uploads still work
- ✅ Audio transcription still works
- ✅ Local Ollama models still work

### Final Recommendation

**Proceed with migration** BUT:
- Focus on **server-side improvements** (biggest wins)
- **Skip AI Elements** (not compatible with Obsidian)
- Use **incremental approach** with feature flags
- Maintain **backward compatibility** during transition
- **Test heavily** before removing old code

The migration offers real benefits (better streaming, cleaner tool code, future-proofing) but requires careful execution to avoid breaking the production plugin.

---

**Document Version:** 2.0 (Extended)  
**Last Updated:** November 22, 2025  
**Author:** AI Implementation Analysis  
**Reviewers:** [To be filled]
