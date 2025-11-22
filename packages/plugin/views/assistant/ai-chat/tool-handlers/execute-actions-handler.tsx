import React, { useState } from "react";
import { TFile } from "obsidian";
import { ToolHandlerProps } from "./types";
import { usePlugin } from "../../provider";

export function ExecuteActionsHandler({ toolInvocation, handleAddResult, app }: ToolHandlerProps) {
  const plugin = usePlugin();
  const [isDone, setIsDone] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const determineAction = (userPrompt: string): 'tags' | 'folders' | 'name' => {
    const prompt = userPrompt.toLowerCase();
    if (prompt.includes('tag') || prompt.includes('label')) {
      return 'tags';
    }
    if (prompt.includes('folder') || prompt.includes('move') || prompt.includes('organize')) {
      return 'folders';
    }
    return 'name'; // Default to rename if no specific action mentioned
  };

  const handleExecute = async () => {
    try {
      setIsProcessing(true);
      const { filePaths, userPrompt } = toolInvocation.args;
      const actionResults: string[] = [];
      const action = determineAction(userPrompt);

      for (const filePath of filePaths) {
        try {
          const file = plugin.app.vault.getAbstractFileByPath(filePath) as TFile;
          if (!file) {
            actionResults.push(`❌ File not found: ${filePath}`);
            continue;
          }

          const content = await plugin.app.vault.read(file);
          
          switch (action) {
            case 'tags': {
              const existingTags = plugin.app.metadataCache.getFileCache(file)?.tags?.map(t => t.tag) || [];
              const suggestions = await plugin.recommendTags(content, filePath, existingTags);
              if (suggestions.length > 0) {
                const topTag = suggestions[0].tag;
                await plugin.appendTag(file, topTag);
                actionResults.push(`✅ Added tag ${topTag} to ${file.name}`);
              } else {
                actionResults.push(`ℹ️ No tag suggestions for ${file.name}`);
              }
              break;
            }
            case 'folders': {
              const suggestions = await plugin.recommendFolders(content, file.name);
              if (suggestions.length > 0) {
                const topFolder = suggestions[0].folder;
                await plugin.moveFile(file, topFolder);
                actionResults.push(`✅ Moved ${file.name} to ${topFolder}`);
              } else {
                actionResults.push(`ℹ️ No folder suggestions for ${file.name}`);
              }
              break;
            }
            case 'name': {
              const suggestions = await plugin.recommendName(content, file.name);
              if (suggestions.length > 0) {
                const newName = suggestions[0].title;
                const newPath = `${file.parent?.path || ""}/${newName}.md`;
                await plugin.moveFile(file, newPath);
                actionResults.push(`✅ Renamed ${file.name} to ${newName}.md`);
              } else {
                actionResults.push(`ℹ️ No name suggestions for ${file.name}`);
              }
              break;
            }
          }
        } catch (error) {
          actionResults.push(`❌ Error processing ${filePath}: ${error.message}`);
        }
      }

      setResults(actionResults);
      setIsDone(true);
      handleAddResult(JSON.stringify({ success: true, actionResults }));
    } catch (error) {
      setResults([`❌ Error: ${error.message}`]);
      setIsDone(true);
      handleAddResult(JSON.stringify({ success: false, error: error.message }));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 p-4 border border-[--background-modifier-border]">
      <div className="text-[--text-normal]">
        Ready to process {toolInvocation.args.filePaths.length} file(s) based on content analysis
      </div>
      {results.length > 0 && (
        <div className="text-sm space-y-1">
          {results.map((result, i) => (
            <div
              key={i}
              className={
                result.startsWith("✅")
                  ? "text-[--text-success]"
                  : result.startsWith("ℹ️")
                  ? "text-[--text-muted]"
                  : "text-[--text-error]"
              }
            >
              {result}
            </div>
          ))}
        </div>
      )}
      {!isDone && (
        <button
          className="px-4 py-2 bg-[--interactive-accent] text-[--text-on-accent] hover:bg-[--interactive-accent-hover] disabled:opacity-50"
          onClick={handleExecute}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "Execute Actions"}
        </button>
      )}
    </div>
  );
}
