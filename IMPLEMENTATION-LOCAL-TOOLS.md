# Local Tool Implementation Plan - Obsidian API Integration

## Overview

This document outlines the implementation plan for extending Note Companion's local tool execution capabilities with comprehensive Obsidian API functions. All tools follow the **server-defined, client-executed** pattern documented in AGENTS.MD.

---

## Current Tool Architecture (Recap)

### The Pattern
1. **Server** (`packages/web/app/api/(newai)/chat/tools.ts`) - Defines tools (schema only)
2. **AI Model** - Decides when to call tools
3. **Client** (`packages/plugin/views/assistant/ai-chat/`) - Executes tools using Obsidian API
4. **Results** - Sent back to AI via streaming

### Existing Tools (11 total)
- `getSearchQuery` - Semantic search
- `searchByName` - Name pattern search
- `getLastModifiedFiles` - Recent files
- `getYoutubeVideoId` - YouTube transcripts
- `appendContentToFile` - Add content
- `addTextToDocument` - Add sections
- `modifyDocumentText` - Edit content
- `generateSettings` - Create settings
- `analyzeVaultStructure` - Vault analysis
- `moveFiles` - Organize files
- `renameFiles` - Rename files
- `executeActionsOnFileBasedOnPrompt` - Complex operations

---

## Obsidian API Capabilities (From Research)

### 1. Vault Operations (`app.vault`)

**File Management:**
- `vault.create(path, data, options)` - Create files
- `vault.modify(file, data, options)` - Modify file content
- `vault.append(file, data, options)` - Append to files
- `vault.delete(file)` - Delete files
- `vault.rename(file, newPath)` - Rename/move files
- `vault.read(file)` - Read file contents
- `vault.cachedRead(file)` - Read with cache
- `vault.getMarkdownFiles()` - Get all markdown files
- `vault.getAbstractFileByPath(path)` - Get file by path
- `vault.getAllLoadedFiles()` - Get all files/folders

**Type Checking:**
- `file instanceof TFile` - Check if file
- `file instanceof TFolder` - Check if folder

---

### 2. Metadata Cache (`app.metadataCache`)

**Cache Access:**
- `metadataCache.getFileCache(file)` - Get cached metadata
- `metadataCache.getCache(path)` - Get cache by path

**Metadata Properties:**
```typescript
interface CachedMetadata {
  frontmatter?: any;           // YAML frontmatter
  tags?: TagCache[];           // Inline tags
  links?: LinkCache[];         // Internal links
  embeds?: EmbedCache[];       // Embedded files
  headings?: HeadingCache[];   // Document headings
  sections?: SectionCache[];   // Document sections
  frontmatterLinks?: FrontmatterLinkCache[];
}
```

**Link Analysis:**
- `metadataCache.resolvedLinks` - All resolved links
- `metadataCache.unresolvedLinks` - Broken links
- `metadataCache.getBacklinksForFile(file)` - Get backlinks

**Tag Operations:**
- `getAllTags(cache)` - Get all tags from cache
- `parseFrontMatterTags(frontmatter)` - Extract frontmatter tags
- `metadataCache.getTags()` - Get all vault tags

---

### 3. File Manager (`app.fileManager`)

**Frontmatter Operations:**
```typescript
await app.fileManager.processFrontMatter(file, (frontmatter) => {
  // Modify frontmatter object
  frontmatter.tags = frontmatter.tags || [];
  frontmatter.tags.push("new-tag");
  frontmatter.date = new Date().toISOString();
  delete frontmatter.oldField;
});
```

**Link Operations:**
- `fileManager.generateMarkdownLink(file, sourcePath)` - Create link
- `fileManager.renameFile(file, newPath)` - Rename with link updates

---

### 4. Workspace (`app.workspace`)

**Active File:**
- `workspace.getActiveFile()` - Get current file
- `workspace.getActiveViewOfType(MarkdownView)` - Get markdown view

**Navigation:**
- `workspace.openLinkText(path, sourcePath)` - Open file by link
- `workspace.getLeaf().openFile(file)` - Open file in pane

**Editor:**
- `workspace.activeEditor` - Access editor
- `editor.getValue()` - Get editor content
- `editor.setValue()` - Set editor content
- `editor.getCursor()` - Get cursor position
- `editor.getSelection()` - Get selected text

---

### 5. Utilities (`obsidian`)

**YAML/Frontmatter:**
- `getFrontMatterInfo(content)` - Parse frontmatter
- `parseYaml(yaml)` - Parse YAML string
- `parseFrontMatterAliases(frontmatter)` - Extract aliases

**Path Operations:**
- `normalizePath(path)` - Normalize path
- `getLinkpath(linktext)` - Get path from link

---

## Proposed New Tools

### Category 1: Metadata & Tags

#### 1. `getFileMetadata`
**Purpose:** Extract comprehensive metadata from file(s)

**Server Definition:**
```typescript
getFileMetadata: {
  description: "Extract metadata from files including frontmatter, tags, links, headings, and creation/modification dates",
  parameters: z.object({
    filePaths: z.array(z.string()).describe("Paths of files to extract metadata from"),
    includeContent: z.boolean().optional().describe("Whether to include file content"),
    includeFrontmatter: z.boolean().optional().describe("Include YAML frontmatter"),
    includeTags: z.boolean().optional().describe("Include all tags"),
    includeLinks: z.boolean().optional().describe("Include internal links"),
    includeBacklinks: z.boolean().optional().describe("Include backlinks"),
  }),
}
```

**Client Implementation:**
```typescript
// packages/plugin/views/assistant/ai-chat/tool-handlers/metadata-handler.tsx
const extractMetadata = async (filePath: string, options: MetadataOptions) => {
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!(file instanceof TFile)) return null;
  
  const cache = app.metadataCache.getFileCache(file);
  const metadata: any = {
    path: file.path,
    name: file.basename,
    created: file.stat.ctime,
    modified: file.stat.mtime,
    size: file.stat.size,
  };
  
  if (options.includeFrontmatter && cache?.frontmatter) {
    metadata.frontmatter = cache.frontmatter;
  }
  
  if (options.includeTags) {
    metadata.tags = getAllTags(cache);
  }
  
  if (options.includeLinks) {
    metadata.links = cache?.links?.map(l => l.link) || [];
    metadata.embeds = cache?.embeds?.map(e => e.link) || [];
  }
  
  if (options.includeBacklinks) {
    const backlinks = app.metadataCache.getBacklinksForFile(file);
    metadata.backlinks = Array.from(backlinks.keys());
  }
  
  if (options.includeContent) {
    metadata.content = await app.vault.read(file);
  }
  
  return metadata;
};
```

---

#### 2. `updateFrontmatter`
**Purpose:** Update YAML frontmatter properties

**Server Definition:**
```typescript
updateFrontmatter: {
  description: "Update or add frontmatter properties to files",
  parameters: z.object({
    filePath: z.string().describe("Path to the file"),
    updates: z.record(z.any()).describe("Frontmatter properties to update/add"),
    deletions: z.array(z.string()).optional().describe("Properties to remove"),
    message: z.string().describe("Explanation of changes"),
  }),
}
```

**Client Implementation:**
```typescript
const updateFrontmatter = async (filePath: string, updates: Record<string, any>, deletions?: string[]) => {
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!(file instanceof TFile)) throw new Error("File not found");
  
  await app.fileManager.processFrontMatter(file, (fm) => {
    // Add/update properties
    Object.entries(updates).forEach(([key, value]) => {
      fm[key] = value;
    });
    
    // Delete properties
    deletions?.forEach(key => delete fm[key]);
  });
};
```

---

#### 3. `addTags`
**Purpose:** Add tags to files (frontmatter or inline)

**Server Definition:**
```typescript
addTags: {
  description: "Add tags to files either in frontmatter or inline in content",
  parameters: z.object({
    filePaths: z.array(z.string()).describe("Files to tag"),
    tags: z.array(z.string()).describe("Tags to add (without #)"),
    location: z.enum(["frontmatter", "inline", "both"]).describe("Where to add tags"),
    inlinePosition: z.enum(["top", "bottom"]).optional().describe("Position for inline tags"),
    message: z.string().describe("Explanation of tagging strategy"),
  }),
}
```

---

#### 4. `getTaggedFiles`
**Purpose:** Find all files with specific tags

**Server Definition:**
```typescript
getTaggedFiles: {
  description: "Find files containing specific tags",
  parameters: z.object({
    tags: z.array(z.string()).describe("Tags to search for"),
    matchAll: z.boolean().optional().describe("Require all tags (AND) vs any tag (OR)"),
    excludeTags: z.array(z.string()).optional().describe("Tags to exclude"),
    folder: z.string().optional().describe("Limit search to folder"),
  }),
}
```

---

### Category 2: Links & Graph

#### 5. `getBacklinks`
**Purpose:** Get all files linking to a specific file

**Server Definition:**
```typescript
getBacklinks: {
  description: "Get all files that link to specified files (backlinks/incoming links)",
  parameters: z.object({
    filePaths: z.array(z.string()).describe("Files to get backlinks for"),
    includeUnresolved: z.boolean().optional().describe("Include unresolved links"),
  }),
}
```

**Client Implementation:**
```typescript
const getBacklinks = (filePath: string) => {
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!(file instanceof TFile)) return [];
  
  const backlinks = app.metadataCache.getBacklinksForFile(file);
  return {
    resolved: Array.from(backlinks.keys()).map(path => ({
      path,
      count: backlinks.get(path),
    })),
    unresolved: Object.entries(app.metadataCache.unresolvedLinks)
      .filter(([, links]) => filePath in links)
      .map(([path, links]) => ({
        path,
        count: links[filePath],
      })),
  };
};
```

---

#### 6. `getOutgoingLinks`
**Purpose:** Get all links from a file

**Server Definition:**
```typescript
getOutgoingLinks: {
  description: "Get all outgoing links and embeds from files",
  parameters: z.object({
    filePaths: z.array(z.string()).describe("Files to analyze"),
    includeEmbeds: z.boolean().optional().describe("Include embedded files"),
    resolvedOnly: z.boolean().optional().describe("Only resolved links"),
  }),
}
```

---

#### 7. `findBrokenLinks`
**Purpose:** Find all unresolved links in vault

**Server Definition:**
```typescript
findBrokenLinks: {
  description: "Find all broken/unresolved links in the vault or specific folders",
  parameters: z.object({
    folder: z.string().optional().describe("Limit to specific folder"),
    groupBySource: z.boolean().optional().describe("Group by source file"),
  }),
}
```

---

#### 8. `createLink`
**Purpose:** Create links between notes

**Server Definition:**
```typescript
createLink: {
  description: "Create internal links between notes with optional display text",
  parameters: z.object({
    sourceFile: z.string().describe("File to add link in"),
    targetFile: z.string().describe("File to link to"),
    displayText: z.string().optional().describe("Custom display text"),
    position: z.enum(["cursor", "top", "bottom", "after-frontmatter"]).describe("Where to insert"),
    heading: z.string().optional().describe("Link to specific heading"),
    block: z.string().optional().describe("Link to specific block"),
  }),
}
```

---

### Category 3: Content Analysis

#### 9. `getHeadings`
**Purpose:** Extract document structure

**Server Definition:**
```typescript
getHeadings: {
  description: "Extract document headings and structure to understand content organization",
  parameters: z.object({
    filePaths: z.array(z.string()).describe("Files to analyze"),
    minLevel: z.number().optional().describe("Minimum heading level (1-6)"),
    maxLevel: z.number().optional().describe("Maximum heading level (1-6)"),
  }),
}
```

**Client Implementation:**
```typescript
const getHeadings = (filePath: string, minLevel = 1, maxLevel = 6) => {
  const file = app.vault.getAbstractFileByPath(filePath);
  const cache = app.metadataCache.getFileCache(file);
  
  return cache?.headings
    ?.filter(h => h.level >= minLevel && h.level <= maxLevel)
    .map(h => ({
      level: h.level,
      heading: h.heading,
      position: h.position,
    })) || [];
};
```

---

#### 10. `findOrphanFiles`
**Purpose:** Find notes with no links

**Server Definition:**
```typescript
findOrphanFiles: {
  description: "Find orphan notes (files with no incoming or outgoing links)",
  parameters: z.object({
    folder: z.string().optional().describe("Limit to folder"),
    includeWithTags: z.boolean().optional().describe("Include files that have tags"),
  }),
}
```

---

#### 11. `getFilesByDate`
**Purpose:** Find files by creation/modification date

**Server Definition:**
```typescript
getFilesByDate: {
  description: "Find files created or modified within a date range",
  parameters: z.object({
    dateType: z.enum(["created", "modified"]).describe("Date type to filter by"),
    startDate: z.string().describe("Start date (ISO format)"),
    endDate: z.string().optional().describe("End date (ISO format, defaults to now)"),
    folder: z.string().optional().describe("Limit to folder"),
    sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort order"),
  }),
}
```

---

### Category 4: Advanced Operations

#### 12. `duplicateFile`
**Purpose:** Create a copy of a file

**Server Definition:**
```typescript
duplicateFile: {
  description: "Create a duplicate of a file with optional modifications",
  parameters: z.object({
    sourcePath: z.string().describe("File to duplicate"),
    newPath: z.string().describe("Path for duplicate"),
    updateFrontmatter: z.record(z.any()).optional().describe("Frontmatter updates for duplicate"),
    message: z.string().describe("Explanation of duplication"),
  }),
}
```

---

#### 13. `mergeFiles`
**Purpose:** Combine multiple files into one

**Server Definition:**
```typescript
mergeFiles: {
  description: "Merge multiple files into a single file with optional separator",
  parameters: z.object({
    sourcePaths: z.array(z.string()).describe("Files to merge"),
    targetPath: z.string().describe("Path for merged file"),
    separator: z.string().optional().describe("Separator between files"),
    includeFrontmatter: z.boolean().optional().describe("Include frontmatter from all files"),
    deleteSource: z.boolean().optional().describe("Delete source files after merge"),
    message: z.string().describe("Explanation of merge"),
  }),
}
```

---

#### 14. `createFileFromTemplate`
**Purpose:** Create new file from template

**Server Definition:**
```typescript
createFileFromTemplate: {
  description: "Create new file from template with variable substitution",
  parameters: z.object({
    templatePath: z.string().describe("Path to template file"),
    newFilePath: z.string().describe("Path for new file"),
    variables: z.record(z.string()).optional().describe("Variables to replace in template"),
    openFile: z.boolean().optional().describe("Open file after creation"),
    message: z.string().describe("Explanation of file creation"),
  }),
}
```

---

#### 15. `batchUpdateFiles`
**Purpose:** Update multiple files at once

**Server Definition:**
```typescript
batchUpdateFiles: {
  description: "Apply same operations to multiple files (find and replace, add tags, update frontmatter, etc.)",
  parameters: z.object({
    filePaths: z.array(z.string()).describe("Files to update"),
    operations: z.array(z.object({
      type: z.enum(["replace", "addTag", "updateFrontmatter", "appendContent"]),
      params: z.any(),
    })).describe("Operations to perform"),
    message: z.string().describe("Explanation of batch update"),
  }),
}
```

---

## AI Model Decision Framework: When to Use Which Tool

This section provides guidance for AI models on how to select the appropriate tool based on user intent. Similar to how an AI agent uses internal logic to choose between Read, Grep, or Task tools, the AI model needs clear decision criteria for vault operations.

### Decision Tree for Tool Selection

```
User asks about vault content/organization
├─ Need file metadata/properties?
│  ├─ Single file → getFileMetadata
│  └─ Multiple files with specific tags → getTaggedFiles
│
├─ Need to modify content?
│  ├─ Update frontmatter → updateFrontmatter
│  ├─ Add tags → addTags
│  ├─ Append content → appendContentToFile
│  └─ Batch changes → batchUpdateFiles
│
├─ Need to analyze relationships?
│  ├─ Find what links to this → getBacklinks
│  ├─ Find what this links to → getOutgoingLinks
│  ├─ Find broken links → findBrokenLinks
│  └─ Find isolated notes → findOrphanFiles
│
├─ Need to search/discover?
│  ├─ Search by content → getSearchQuery (existing)
│  ├─ Search by name → searchByName (existing)
│  ├─ Search by tags → getTaggedFiles
│  ├─ Search by date → getFilesByDate
│  └─ Find recent changes → getLastModifiedFiles (existing)
│
├─ Need to organize/structure?
│  ├─ Move files → moveFiles (existing)
│  ├─ Rename files → renameFiles (existing)
│  ├─ Create from template → createFileFromTemplate
│  ├─ Combine notes → mergeFiles
│  └─ Duplicate note → duplicateFile
│
└─ Need document structure?
   ├─ Get headings/outline → getHeadings
   ├─ Analyze structure → analyzeVaultStructure (existing)
   └─ Complex operations → executeActionsOnFileBasedOnPrompt (existing)
```

---

### Tool Selection Patterns with Examples

#### Pattern 1: Information Gathering

**User Intent:** "Tell me about my note on machine learning"

**Decision Process:**
1. Need to find the file → `searchByName` or `getSearchQuery`
2. Need comprehensive info → `getFileMetadata` with all options enabled

**Tool Chain:**
```
getSearchQuery(query: "machine learning") 
  → Get file paths
  → getFileMetadata(paths: results, includeAll: true)
  → Present comprehensive information
```

**Why not other tools?**
- ❌ `getBacklinks` - Too specific, user wants general info
- ❌ `updateFrontmatter` - User wants info, not modification
- ✅ `getFileMetadata` - Provides complete picture

---

#### Pattern 2: Relationship Analysis

**User Intent:** "What notes link to my project planning document?"

**Decision Process:**
1. Clear backlink request → `getBacklinks`
2. Single file, incoming links → Not `getOutgoingLinks`

**Tool Call:**
```
getBacklinks(
  filePaths: ["projects/planning.md"],
  includeUnresolved: true
)
```

**Why this tool?**
- ✅ Direct backlink request
- ✅ User wants incoming, not outgoing
- ✅ Simple, focused operation

---

#### Pattern 3: Vault Maintenance

**User Intent:** "Find and fix broken links in my vault"

**Decision Process:**
1. Multi-step operation
2. First find → `findBrokenLinks`
3. Then offer to fix → `createLink` or manual guidance

**Tool Chain:**
```
findBrokenLinks(folder: "/", groupBySource: true)
  → Present results
  → User confirms
  → createLink for each broken link (if possible)
```

**Why this pattern?**
- ✅ Broken links need discovery first
- ✅ Multi-step allows user confirmation
- ✅ Not all broken links should auto-fix

---

#### Pattern 4: Content Organization

**User Intent:** "Add project tag to all notes in my work folder"

**Decision Process:**
1. Batch operation → Consider `batchUpdateFiles`
2. Specific operation (tags) → Could use `addTags`
3. Scope is folder-based → Use `addTags` with folder filter

**Tool Call:**
```
addTags(
  filePaths: [...files in work folder...],
  tags: ["project"],
  location: "frontmatter",
  message: "Adding project tag to all work notes for better organization"
)
```

**Why `addTags` over `batchUpdateFiles`?**
- ✅ More specific = better UX
- ✅ Clearer intent in UI
- ✅ Better error messages

---

#### Pattern 5: Complex Workflows

**User Intent:** "Organize my daily notes by creating monthly summaries"

**Decision Process:**
1. Multi-step, complex logic
2. Need to group by date
3. Need to merge content
4. Need to create new files

**Tool Chain:**
```
getFilesByDate(
  dateType: "created",
  startDate: "2024-01-01",
  endDate: "2024-01-31"
)
  → Group results by month
  → For each month:
      mergeFiles(
        sourcePaths: monthNotes,
        targetPath: "summaries/2024-01.md",
        separator: "---"
      )
```

**Why this approach?**
- ✅ Breaking complex task into steps
- ✅ Each step uses right tool
- ✅ User can see progress

---

### Common Anti-Patterns (What NOT to Do)

#### ❌ Anti-Pattern 1: Using Search When Metadata is Better

**Bad:**
```
User: "Find all notes tagged with #meeting"
Tool: getSearchQuery(query: "#meeting")
```

**Good:**
```
User: "Find all notes tagged with #meeting"
Tool: getTaggedFiles(tags: ["meeting"], matchAll: true)
```

**Why?** `getTaggedFiles` uses indexed metadata (faster, more accurate) vs content search.

---

#### ❌ Anti-Pattern 2: Over-Using executeActionsOnFileBasedOnPrompt

**Bad:**
```
User: "Rename my note to 'New Title'"
Tool: executeActionsOnFileBasedOnPrompt(
  filePaths: ["note.md"],
  userPrompt: "rename to New Title"
)
```

**Good:**
```
User: "Rename my note to 'New Title'"
Tool: renameFiles(
  files: [{oldPath: "note.md", newName: "New Title"}],
  message: "Renaming note to user-specified title"
)
```

**Why?** Use specific tools when operation is clear. Save complex tool for truly ambiguous cases.

---

#### ❌ Anti-Pattern 3: Not Chaining Tools

**Bad:**
```
User: "Find orphan notes and tag them as 'to-review'"
Tool: batchUpdateFiles(...)  // Trying to do both at once
```

**Good:**
```
User: "Find orphan notes and tag them as 'to-review'"
Tool Chain:
  1. findOrphanFiles(folder: "/", includeWithTags: false)
  2. Present results to user
  3. addTags(filePaths: results, tags: ["to-review"])
```

**Why?** User should see what was found before modification.

---

### Tool Selection Checklist

Before calling a tool, the AI should verify:

**1. Is this the most specific tool available?**
- ✅ Use `getTaggedFiles` for tag queries, not `getSearchQuery`
- ✅ Use `getBacklinks` for link analysis, not `getFileMetadata`

**2. Does this operation modify data?**
- ✅ If yes, include clear `message` parameter explaining what will change
- ✅ Consider asking user for confirmation in message

**3. Is this a multi-step operation?**
- ✅ Break into tool chain
- ✅ Show results of discovery before modification
- ✅ Let user confirm destructive operations

**4. Do I need context from previous steps?**
- ✅ Use results from discovery tools (getFilesByDate, findOrphanFiles)
- ✅ Pass file paths to action tools (addTags, moveFiles)

**5. Is the scope appropriate?**
- ✅ Limit to folder when possible
- ✅ Use filters (date range, tags) to reduce results
- ✅ Don't operate on entire vault unless user explicitly requests

---

### Real-World Usage Examples

#### Example 1: Research Vault Cleanup

**User:** "I have too many unlinked notes in my research folder. Help me organize them."

**AI Decision Process:**
```
Step 1: Discover orphans
  Tool: findOrphanFiles(folder: "research", includeWithTags: false)
  Result: 47 orphan notes found

Step 2: Analyze patterns
  Tool: getFileMetadata(filePaths: orphanPaths, includeFrontmatter: true, includeTags: true)
  Result: Some have frontmatter, some don't; various creation dates

Step 3: Propose organization
  AI: "I found 47 orphaned notes. I can:
       1. Tag them as 'to-review' for manual triage
       2. Organize by creation date into monthly folders
       3. Create a master 'Unlinked Research' note linking to all
       Which would you prefer?"

Step 4: Execute based on choice
  If option 1: addTags(...)
  If option 2: moveFiles(...) + getFilesByDate(...)
  If option 3: createFileFromTemplate(...) + content generation
```

---

#### Example 2: Project Documentation

**User:** "Create a project overview that links to all my planning documents"

**AI Decision Process:**
```
Step 1: Find planning documents
  Tool: getSearchQuery(query: "planning")
  Alternative: getTaggedFiles(tags: ["planning"])

Step 2: Gather metadata
  Tool: getFileMetadata(filePaths: results, includeHeadings: true)

Step 3: Generate overview
  Tool: createFileFromTemplate(
    templatePath: "templates/project-overview.md",
    newFilePath: "projects/overview.md",
    variables: {
      links: generateLinksList(results),
      date: currentDate
    }
  )
```

---

#### Example 3: Knowledge Graph Analysis

**User:** "Show me the connection network for my 'Machine Learning' note"

**AI Decision Process:**
```
Step 1: Get direct connections
  Tool: getBacklinks(filePaths: ["ml.md"])
  Tool: getOutgoingLinks(filePaths: ["ml.md"])

Step 2: Get second-degree connections
  For each backlink:
    Tool: getBacklinks(filePaths: [backlink])
  
Step 3: Analyze and present
  AI generates visualization description or suggests:
  "Your 'Machine Learning' note is connected to 12 direct notes,
   with 34 second-degree connections. The most connected topics are..."
```

---

### Efficiency Considerations

**Tool Call Optimization:**

**Good - Parallel Calls:**
```
# These can run in parallel (no dependencies)
await Promise.all([
  getBacklinks(["note1.md"]),
  getOutgoingLinks(["note1.md"]),
  getFileMetadata(["note1.md"])
])
```

**Bad - Sequential When Unnecessary:**
```
# Don't do this if not needed
const backlinks = await getBacklinks(["note1.md"]);
const outgoing = await getOutgoingLinks(["note1.md"]);  // Could run parallel
const metadata = await getFileMetadata(["note1.md"]);    // Could run parallel
```

**Good - Sequential When Dependent:**
```
# Results feed into next step
const orphans = await findOrphanFiles("/");
const metadata = await getFileMetadata(orphans.map(f => f.path));
const organized = await organizeByMetadata(metadata);
```

---

### Tool Combination Recipes

**Recipe 1: Complete File Analysis**
```
getFileMetadata + getBacklinks + getOutgoingLinks + getHeadings
→ Comprehensive file profile
```

**Recipe 2: Vault Health Check**
```
findOrphanFiles + findBrokenLinks + getFilesByDate(modified < 6 months ago)
→ Maintenance report
```

**Recipe 3: Tag-Based Organization**
```
getTaggedFiles → getFileMetadata → moveFiles or batchUpdateFiles
→ Organize by content type
```

**Recipe 4: Link Network Building**
```
getSearchQuery → getFileMetadata → createLink (between related notes)
→ Build knowledge graph
```

---

## Implementation Checklist

### Phase 1: High-Priority Tools (Week 1)
- [ ] `getFileMetadata` - Essential for understanding files
- [ ] `updateFrontmatter` - Common operation
- [ ] `addTags` - Frequently requested
- [ ] `getBacklinks` - Graph understanding
- [ ] `getOutgoingLinks` - Graph understanding
- [ ] `getHeadings` - Content structure

### Phase 2: Medium-Priority Tools (Week 2)
- [ ] `getTaggedFiles` - Tag-based search
- [ ] `findBrokenLinks` - Vault maintenance
- [ ] `createLink` - Link creation
- [ ] `findOrphanFiles` - Vault cleanup
- [ ] `getFilesByDate` - Temporal queries

### Phase 3: Advanced Tools (Week 3)
- [ ] `duplicateFile` - File operations
- [ ] `mergeFiles` - Content consolidation
- [ ] `createFileFromTemplate` - Templating
- [ ] `batchUpdateFiles` - Bulk operations

---

## Implementation Pattern (For Each Tool)

### 1. Define on Server
```typescript
// packages/web/app/api/(newai)/chat/tools.ts
export const chatTools = {
  // ... existing tools
  
  myNewTool: {
    description: "Clear description for AI",
    parameters: z.object({
      param1: z.string().describe("What this parameter does"),
    }),
  },
};
```

### 2. Add Handler Mapping
```typescript
// packages/plugin/views/assistant/ai-chat/tool-handlers/tool-invocation-handler.tsx
const handlers = {
  // ... existing handlers
  
  myNewTool: () => (
    <MyNewToolHandler
      toolInvocation={toolInvocation}
      handleAddResult={handleAddResult}
      app={app}
    />
  ),
};
```

### 3. Create Handler Component
```typescript
// packages/plugin/views/assistant/ai-chat/tool-handlers/my-new-tool-handler.tsx
import React, { useRef } from "react";
import { ToolHandlerProps } from "./types";

export function MyNewToolHandler({ toolInvocation, handleAddResult, app }: ToolHandlerProps) {
  const hasFetchedRef = useRef(false);

  React.useEffect(() => {
    const execute = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const { param1 } = toolInvocation.args;
        
        try {
          // Execute using Obsidian API
          const result = await performOperation(app, param1);
          handleAddResult(JSON.stringify(result));
        } catch (error) {
          handleAddResult(JSON.stringify({ error: error.message }));
        }
      }
    };
    execute();
  }, [toolInvocation, handleAddResult, app]);

  return (
    <div className="text-sm text-[--text-muted]">
      {!("result" in toolInvocation)
        ? "Executing..."
        : "Complete"}
    </div>
  );
}
```

### 4. Add Tool Title
```typescript
// tool-invocation-handler.tsx
const toolTitles = {
  // ... existing titles
  myNewTool: "My New Tool",
};
```

---

## Testing Strategy

### Unit Tests
- Test individual Obsidian API operations
- Mock `app` object for isolated testing

### Integration Tests
- Test full tool execution flow
- Verify server → client → result flow

### E2E Tests
- Test with real Obsidian vault
- Verify AI decision making
- Test error scenarios

---

## Benefits of Extended Tool Set

### For Users
✅ Comprehensive vault management via natural language  
✅ Graph analysis and link discovery  
✅ Automated content organization  
✅ Metadata-driven workflows  
✅ Batch operations without manual scripting  

### For System
✅ Follows established patterns  
✅ Privacy-preserving (local execution)  
✅ Leverages Obsidian's native capabilities  
✅ Extensible architecture  

---

## Success Metrics

- [ ] 15 new tools implemented
- [ ] All tools follow local execution pattern
- [ ] Comprehensive error handling
- [ ] Documentation for each tool
- [ ] User feedback incorporated
- [ ] Performance benchmarks met

---

**Last Updated:** 2025-01-22  
**Status:** Ready for Implementation  
**Priority:** High
