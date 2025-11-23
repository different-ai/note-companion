import React, { useRef } from "react";
import { TFile } from "obsidian";
import { getAllTags } from "obsidian";
import { ToolHandlerProps } from "./types";

interface MetadataArgs {
  filePaths: string[];
  includeContent?: boolean;
  includeFrontmatter?: boolean;
  includeTags?: boolean;
  includeLinks?: boolean;
  includeBacklinks?: boolean;
}

interface FileMetadata {
  path: string;
  name: string;
  created: number;
  modified: number;
  size: number;
  frontmatter?: any;
  tags?: string[];
  links?: string[];
  embeds?: string[];
  backlinks?: string[];
  content?: string;
}

export function MetadataHandler({
  toolInvocation,
  handleAddResult,
  app,
}: ToolHandlerProps) {
  const hasFetchedRef = useRef(false);

  const extractMetadata = async (
    filePath: string,
    options: Omit<MetadataArgs, "filePaths">
  ): Promise<FileMetadata | null> => {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) return null;

    const cache = app.metadataCache.getFileCache(file);
    const metadata: FileMetadata = {
      path: file.path,
      name: file.basename,
      created: file.stat.ctime,
      modified: file.stat.mtime,
      size: file.stat.size,
    };

    // Include frontmatter (default: true)
    if (options.includeFrontmatter !== false && cache?.frontmatter) {
      metadata.frontmatter = cache.frontmatter;
    }

    // Include tags (default: true)
    if (options.includeTags !== false && cache) {
      const tags = getAllTags(cache);
      if (tags) {
        metadata.tags = tags;
      }
    }

    // Include links (default: true)
    if (options.includeLinks !== false && cache) {
      metadata.links = cache.links?.map((l) => l.link) || [];
      metadata.embeds = cache.embeds?.map((e) => e.link) || [];
    }

    // Include backlinks (default: false)
    if (options.includeBacklinks === true) {
      // Get backlinks from resolved links
      const allBacklinks: string[] = [];
      const resolvedLinks = app.metadataCache.resolvedLinks;
      
      for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
        if (links[file.path]) {
          allBacklinks.push(sourcePath);
        }
      }
      
      metadata.backlinks = allBacklinks;
    }

    // Include content (default: false)
    if (options.includeContent === true) {
      metadata.content = await app.vault.read(file);
    }

    return metadata;
  };

  React.useEffect(() => {
    const execute = async () => {
      if (!hasFetchedRef.current && !("result" in toolInvocation)) {
        hasFetchedRef.current = true;
        const args = toolInvocation.args as MetadataArgs;

        try {
          const results = await Promise.all(
            args.filePaths.map((path) =>
              extractMetadata(path, {
                includeContent: args.includeContent,
                includeFrontmatter: args.includeFrontmatter,
                includeTags: args.includeTags,
                includeLinks: args.includeLinks,
                includeBacklinks: args.includeBacklinks,
              })
            )
          );

          // Filter out null results (files not found)
          const validResults = results.filter(
            (r): r is FileMetadata => r !== null
          );

          handleAddResult(JSON.stringify(validResults));
        } catch (error) {
          handleAddResult(
            JSON.stringify({ error: (error as Error).message })
          );
        }
      }
    };

    execute();
  }, [toolInvocation, handleAddResult, app]);

  const args = toolInvocation.args as MetadataArgs;
  const isComplete = "result" in toolInvocation;

  return (
    <div className="text-sm text-[--text-muted]">
      {!isComplete
        ? `Extracting metadata from ${args.filePaths.length} file(s)...`
        : `Metadata extracted for ${args.filePaths.length} file(s)`}
    </div>
  );
}
