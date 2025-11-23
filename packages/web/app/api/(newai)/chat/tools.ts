import { z } from "zod";

const settingsSchema = z.object({
  renameInstructions: z.string().optional(),
  customFolderInstructions: z.string().optional(),
  imageInstructions: z.string().optional(),
});

export const chatTools = {
  getSearchQuery: {
    description: "Extract semantic search queries to find relevant notes based on content and meaning",
    parameters: z.object({
      query: z.string().describe("The semantic search query to find relevant notes"),
    }),
  },
  searchByName: {
    description: "Search for files by name pattern or exact match, useful for finding specific notes or groups of notes",
    parameters: z.object({
      query: z.string().describe("The name pattern to search for (e.g., 'Untitled*', 'daily-*', or exact name)"),
    }),
  },
  getYoutubeVideoId: {
    description: "Extract YouTube video ID to import and organize video content into notes",
    parameters: z.object({
      videoId: z.string().describe("The YouTube video ID"),
    }),
  },
  getLastModifiedFiles: {
    description: "Retrieve recently modified files to track changes and activity in the vault",
    parameters: z.object({
      count: z.number().describe("The number of last modified files to retrieve"),
    }),
  },
  appendContentToFile: {
    description: "Add new content to existing notes while preserving structure and formatting",
    parameters: z.object({
      content: z.string().describe("The formatted content to append to the file"),
      message: z.string().describe("Clear explanation of what content will be added"),
      fileName: z.string().optional().describe("Optional specific file to append to"),
    }),
  },
  addTextToDocument: {
    description: "Add new sections or content to notes with proper formatting and structure",
    parameters: z.object({
      content: z.string().describe("The formatted text content to add"),
      path: z.string().optional().describe("Optional path to the document. If not provided, uses current document"),
    }),
  },
  modifyDocumentText: {
    description: "Edit existing note content while maintaining consistency and structure. Can modify selected text or entire document.",
    parameters: z.object({
      content: z.string().describe("The new formatted content to replace existing content"),
      path: z.string().optional().describe("Optional path to the document. If not provided, uses current document"),
      instructions: z.string().optional().describe("Optional specific instructions for how to modify the content"),
    }),
  },
  generateSettings: {
    description: "Create personalized vault organization settings based on user preferences and best practices",
    parameters: settingsSchema,
  },
  analyzeVaultStructure: {
    description: "Analyze vault organization and provide actionable improvement suggestions (used in onboarding), help me set up my vault organization settings",
    parameters: z.object({
      path: z.string().describe("Path to analyze. Use '/' for all files or specific folder path"),
      maxDepth: z.number().optional().describe("Maximum folder depth to analyze"),
    }),
  },

  moveFiles: {
    description: "Organize files into appropriate folders based on content and structure",
    parameters: z.object({
      moves: z.array(
        z.object({
          sourcePath: z.string().describe("Source path (e.g., '/' for root, or specific folder path)"),
          destinationPath: z.string().describe("Destination folder path"),
          pattern: z.object({
            namePattern: z.string().optional().describe("File name pattern to match (e.g., 'untitled-*', 'daily-*')"),
            extension: z.string().optional().describe("File extension to match"),
          }).optional(),
        })
      ),
      message: z.string().describe("Clear explanation of the proposed file organization"),
    }),
  },
  renameFiles: {
    description: "Rename files intelligently based on content and organizational patterns",
    parameters: z.object({
      files: z.array(
        z.object({
          oldPath: z.string().describe("Current full path of the file"),
          newName: z.string().describe("Descriptive new file name based on content"),
        })
      ),
      message: z.string().describe("Clear explanation of the naming strategy"),
    }),
  },
  executeActionsOnFileBasedOnPrompt: {
    description: "Analyze and organize files through tagging, moving, or renaming based on content analysis",
    parameters: z.object({
      filePaths: z.array(z.string()).describe("List of file paths to analyze and organize"),
      userPrompt: z.string().describe("Specific instructions for file organization strategy"),
    }),
  },

  // New Metadata & Analysis Tools
  getFileMetadata: {
    description: "Extract comprehensive metadata from files including frontmatter, tags, links, headings, and creation/modification dates",
    parameters: z.object({
      filePaths: z.array(z.string()).describe("Paths of files to extract metadata from"),
      includeContent: z.boolean().optional().describe("Whether to include file content (default: false)"),
      includeFrontmatter: z.boolean().optional().describe("Include YAML frontmatter (default: true)"),
      includeTags: z.boolean().optional().describe("Include all tags (default: true)"),
      includeLinks: z.boolean().optional().describe("Include internal links and embeds (default: true)"),
      includeBacklinks: z.boolean().optional().describe("Include backlinks from other notes (default: false)"),
    }),
  },

  updateFrontmatter: {
    description: "Update or add YAML frontmatter properties to files. Can add new properties, update existing ones, or delete properties.",
    parameters: z.object({
      filePath: z.string().describe("Path to the file to update"),
      updates: z.record(z.any()).optional().describe("Object with properties to add/update (e.g., {status: 'in-progress', priority: 'high'})"),
      deletions: z.array(z.string()).optional().describe("Array of property names to remove from frontmatter"),
      message: z.string().describe("Clear explanation of what changes will be made"),
    }),
  },

  addTags: {
    description: "Add tags to files either in frontmatter or inline in content. Useful for categorizing and organizing notes.",
    parameters: z.object({
      filePaths: z.array(z.string()).describe("Files to tag"),
      tags: z.array(z.string()).describe("Tags to add (without # symbol, e.g., ['project', 'important'])"),
      location: z.enum(["frontmatter", "inline", "both"]).describe("Where to add tags: frontmatter (YAML tags array), inline (in content), or both"),
      inlinePosition: z.enum(["top", "bottom"]).optional().describe("Position for inline tags (default: 'bottom')"),
      message: z.string().describe("Explanation of tagging strategy"),
    }),
  },

  getBacklinks: {
    description: "Get all files that link to specified files (backlinks/incoming links). Useful for understanding note relationships and knowledge graph connections.",
    parameters: z.object({
      filePaths: z.array(z.string()).describe("Files to get backlinks for"),
      includeUnresolved: z.boolean().optional().describe("Include unresolved/broken links (default: false)"),
    }),
  },

  getOutgoingLinks: {
    description: "Get all outgoing links and embeds from files. Useful for understanding note dependencies and content structure.",
    parameters: z.object({
      filePaths: z.array(z.string()).describe("Files to analyze for outgoing links"),
      includeEmbeds: z.boolean().optional().describe("Include embedded files/images (default: true)"),
      resolvedOnly: z.boolean().optional().describe("Only include resolved links (default: false)"),
    }),
  },
} as const; 