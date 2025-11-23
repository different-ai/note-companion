# Example Prompts for Note Companion AI Tools

This document contains example prompts that trigger each of the AI tools implemented in Note Companion. Use these to test and explore the capabilities of the system.

---

## Search & Discovery Tools

### getSearchQuery (Existing)
**Prompt:** "Find all my notes about machine learning"  
**What it does:** Performs semantic search through vault content  
**Expected behavior:** Searches file contents for matching terms

---

### searchByName (Existing)
**Prompt:** "Find files with 'meeting' in the name"  
**What it does:** Searches for files by name pattern  
**Expected behavior:** Returns files matching the name pattern

---

### getLastModifiedFiles (Existing)
**Prompt:** "Show me the 10 most recently modified files"  
**What it does:** Gets recently modified files  
**Expected behavior:** Returns list of files sorted by modification date

---

## Metadata & Analysis Tools

### getFileMetadata
**Prompt:** "Tell me everything about my project planning note"  
**Alternative:** "Show me the metadata for 'meeting-notes-2024.md'"  
**What it does:** Extracts comprehensive metadata including frontmatter, tags, links, creation date, etc.  
**Expected behavior:** Returns detailed metadata object with all available information

---

### updateFrontmatter
**Prompt:** "Add a 'status: in-progress' field to my project note"  
**Alternative:** "Update the frontmatter of my daily note to include project: website-redesign"  
**What it does:** Updates or adds YAML frontmatter properties  
**Expected behavior:** Modifies frontmatter and confirms changes

---

### addTags
**Prompt:** "Tag all my meeting notes with #reviewed"  
**Alternative:** "Add tags #project and #important to my planning document"  
**What it does:** Adds tags to files (frontmatter or inline)  
**Expected behavior:** Tags are added to specified files

---

### getBacklinks
**Prompt:** "What notes link to my Machine Learning MOC?"  
**Alternative:** "Show me all backlinks for 'project-overview.md'"  
**What it does:** Gets all files that link to a specific file  
**Expected behavior:** Returns list of files with backlinks and count

---

### getOutgoingLinks
**Prompt:** "What notes does my Project Overview link to?"  
**Alternative:** "Show me all links from 'index.md'"  
**What it does:** Gets all outgoing links from a file  
**Expected behavior:** Returns list of linked files and embeds

---

### getHeadings
**Prompt:** "Show me the structure of my research document"  
**Alternative:** "What are the main sections in my project plan?"  
**What it does:** Extracts document headings and hierarchy  
**Expected behavior:** Returns outline with heading levels

---

## Content Manipulation Tools (Existing)

### appendContentToFile (Existing)
**Prompt:** "Add a new section about testing to my development notes"  
**What it does:** Appends content to existing files  
**Expected behavior:** Content is added to the end of the file

---

### addTextToDocument (Existing)
**Prompt:** "Add a conclusions section to my research paper"  
**What it does:** Adds new sections to documents  
**Expected behavior:** Section is added with proper formatting

---

### modifyDocumentText (Existing)
**Prompt:** "Update the introduction of my article to be more engaging"  
**What it does:** Edits existing document content  
**Expected behavior:** Specified content is modified

---

## File Organization Tools (Existing)

### moveFiles (Existing)
**Prompt:** "Move all my daily notes to the archive folder"  
**What it does:** Organizes files into folders  
**Expected behavior:** Files are moved to specified locations

---

### renameFiles (Existing)
**Prompt:** "Rename 'Untitled.md' to 'Meeting Notes 2024-01-22'"  
**What it does:** Renames files intelligently  
**Expected behavior:** Files are renamed with updated links

---

### executeActionsOnFileBasedOnPrompt (Existing)
**Prompt:** "Organize all my untagged notes from last month"  
**What it does:** Complex file operations based on analysis  
**Expected behavior:** Files are analyzed and organized according to instructions

---

## Vault Management Tools (Existing)

### analyzeVaultStructure (Existing)
**Prompt:** "Analyze my vault organization and suggest improvements"  
**What it does:** Analyzes vault structure  
**Expected behavior:** Provides analysis and recommendations

---

### generateSettings (Existing)
**Prompt:** "Create organization settings for my research vault"  
**What it does:** Generates personalized settings  
**Expected behavior:** Settings are created based on vault analysis

---

## Media Tools (Existing)

### getYoutubeVideoId (Existing)
**Prompt:** "Import the transcript from this YouTube video: https://youtube.com/watch?v=abc123"  
**What it does:** Extracts and imports YouTube transcripts  
**Expected behavior:** Video transcript is retrieved and formatted

---

## Complex Workflows (Multi-Tool Examples)

### Example 1: Complete File Analysis
**Prompt:** "Give me a complete analysis of my 'Machine Learning' note including all its connections"  
**Expected tools:** getFileMetadata → getBacklinks → getOutgoingLinks → getHeadings  
**Expected behavior:** Comprehensive report with metadata, links, and structure

---

### Example 2: Tag-Based Organization
**Prompt:** "Find all my project notes and tag them with #active-project"  
**Expected tools:** getSearchQuery or searchByName → addTags  
**Expected behavior:** Files are found and tagged

---

### Example 3: Vault Cleanup
**Prompt:** "Show me all my notes that have broken links"  
**Expected tools:** findBrokenLinks (future tool)  
**Expected behavior:** List of files with unresolved links

---

## Testing Tips

1. **Start Simple:** Begin with single-tool prompts to understand each tool's behavior
2. **Be Specific:** Include file names or paths when possible
3. **Chain Tools:** Try complex workflows that require multiple tools
4. **Verify Results:** Always check that changes were applied correctly
5. **Use Natural Language:** The AI understands conversational requests

---

## Latest Tools Added

<!-- This section will be updated as new tools are implemented -->

**Last Updated:** 2025-01-22  
**Total Tools:** 15+ (11 existing, 4+ new)

---

## Need Help?

- Check `AGENTS.MD` for technical documentation
- Check `IMPLEMENTATION-LOCAL-TOOLS.md` for tool implementation details
- Open an issue if a tool isn't working as expected
