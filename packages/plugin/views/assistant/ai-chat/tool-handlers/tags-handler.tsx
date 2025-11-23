import React, { useRef } from "react";
import { App, TFile } from "obsidian";
import { ToolInvocation } from "ai";

interface TagsHandlerProps {
  toolInvocation: ToolInvocation;
  handleAddResult: (result: string) => void;
  app: App;
}

export function TagsHandler({
  toolInvocation,
  handleAddResult,
  app,
}: TagsHandlerProps) {
  const hasFetchedRef = useRef(false);

  const addTags = async (
    filePaths: string[],
    tags: string[],
    location: "frontmatter" | "inline" | "both",
    inlinePosition: "top" | "bottom" = "bottom"
  ) => {
    const results = [];

    for (const filePath of filePaths) {
      try {
        const file = app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof TFile)) {
          results.push({
            path: filePath,
            success: false,
            error: "File not found",
          });
          continue;
        }

        // Normalize tags (remove # if present)
        const normalizedTags = tags.map((tag) =>
          tag.startsWith("#") ? tag.slice(1) : tag
        );

        let frontmatterUpdated = false;
        let inlineUpdated = false;

        // Add to frontmatter
        if (location === "frontmatter" || location === "both") {
          try {
            await app.fileManager.processFrontMatter(file, (fm) => {
              // Get existing tags array or create new one
              const existingTags = fm.tags || [];
              const tagsArray = Array.isArray(existingTags)
                ? existingTags
                : [existingTags];

              // Add new tags (avoid duplicates)
              const updatedTags = [
                ...new Set([...tagsArray, ...normalizedTags]),
              ];
              fm.tags = updatedTags;
            });
            frontmatterUpdated = true;
          } catch (error) {
            results.push({
              path: filePath,
              success: false,
              error: `Failed to update frontmatter: ${error.message}`,
            });
            continue;
          }
        }

        // Add inline tags
        if (location === "inline" || location === "both") {
          try {
            const content = await app.vault.read(file);
            const tagLine = normalizedTags.map((tag) => `#${tag}`).join(" ");

            let newContent: string;
            if (inlinePosition === "top") {
              // Add after frontmatter if exists, otherwise at very top
              const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);
              if (frontmatterMatch) {
                const frontmatter = frontmatterMatch[0];
                const afterFrontmatter = content.slice(frontmatter.length);
                newContent = `${frontmatter}${tagLine}\n\n${afterFrontmatter}`;
              } else {
                newContent = `${tagLine}\n\n${content}`;
              }
            } else {
              // Add at bottom
              newContent = `${content}\n\n${tagLine}`;
            }

            await app.vault.modify(file, newContent);
            inlineUpdated = true;
          } catch (error) {
            results.push({
              path: filePath,
              success: false,
              error: `Failed to add inline tags: ${error.message}`,
            });
            continue;
          }
        }

        results.push({
          path: filePath,
          success: true,
          frontmatterUpdated,
          inlineUpdated,
          tagsAdded: normalizedTags,
        });
      } catch (error) {
        results.push({
          path: filePath,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  };

  React.useEffect(() => {
    const handleAddTags = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const { filePaths, tags, location, inlinePosition } =
          toolInvocation.args;

        try {
          const results = await addTags(
            filePaths,
            tags,
            location,
            inlinePosition || "bottom"
          );
          handleAddResult(JSON.stringify(results));
        } catch (error) {
          handleAddResult(
            JSON.stringify({ error: `Failed to add tags: ${error.message}` })
          );
        }
      }
    };

    handleAddTags();
  }, [toolInvocation, handleAddResult, app]);

  const { filePaths, tags, location } = toolInvocation.args;
  const isComplete = "result" in toolInvocation;

  return (
    <div className="text-sm">
      {!isComplete ? (
        <div className="text-[--text-muted]">
          Adding tags {tags.map((t: string) => `#${t}`).join(", ")} to{" "}
          {filePaths.length} file(s) in {location}...
        </div>
      ) : (
        <div className="text-[--text-normal]">
          ✓ Tags added to {filePaths.length} file(s)
        </div>
      )}
    </div>
  );
}
