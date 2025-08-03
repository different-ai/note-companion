# Common Workflows

This document describes common combinations of tools and how they work together to accomplish complex tasks.

## Renaming Untitled Files

### Step 1: Retrieve Untitled Files
```
Could you retrieve all my untitled files?
```
This triggers the search tool to find files matching the "untitled" pattern.

### Step 2: Rename Files
```
rename files with something meaningful
```
This triggers the ExecuteActionsHandler to:
1. Analyze the content of each file
2. Generate meaningful names
3. Show a confirmation button
4. Execute the renaming when confirmed

### What Happens Behind the Scenes
1. The first prompt triggers `searchByName` with pattern "Untitled*"
2. Files are added to context
3. The second prompt triggers `executeActionsOnFileBasedOnPrompt`
4. The ExecuteActionsHandler processes each file


## Finding and Tagging Recent Files

### Step 1: Get Recent Files
```
get my last 7 files
```
This retrieves your most recently modified files.

### Step 2: Add Tags
```
tag these files based on their content
```
This analyzes and tags the files appropriately.

### What Happens Behind the Scenes
1. First prompt triggers `getLastModifiedFiles`
2. Files are added to context
3. Second prompt triggers `executeActionsOnFileBasedOnPrompt` with tag action
4. Tags are suggested and applied with confirmation

## Tips for Effective Workflows
1. Always check the confirmation messages
2. Review suggested changes before confirming
3. Use specific language to trigger desired actions
4. Combine tools in sequence for complex operations
