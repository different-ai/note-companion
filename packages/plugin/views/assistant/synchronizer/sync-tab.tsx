import React, { useState, useEffect } from "react";
import { SectionHeader } from "../section-header";
import { makeApiRequest } from "../../../apiUtils";
import { requestUrl, Notice, TFolder } from "obsidian";
import FileOrganizer from "../../../index";
import { Button } from "../../../components/ui/button";
import { StyledContainer } from "@/components/ui/utils";
import { tw } from "@/lib/utils";

// Import icons for file types
import {
  FileText,
  FileImage,
  RefreshCw,
  Download,
  Cloud,
  Check,
  AlertCircle,
  RotateCw,
  Clock,
  DownloadCloud,
} from "lucide-react";

// Storage key for downloaded files
const DOWNLOADED_FILES_KEY = "file-organizer-downloaded-files";

interface RemoteFile {
  id: string;
  userId: string;
  blobUrl: string;
  fileType: string;
  originalName: string;
  status: "pending" | "processing" | "completed" | "error";
  textContent?: string;
  tokensUsed?: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
  previewUrl?: string; // URL for preview thumbnail
}

// Cache for binary previews
interface PreviewCache {
  [fileId: string]: {
    url: string;
    dataUrl: string;
  };
}

interface PaginatedResponse {
  files: RemoteFile[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function SyncTab({ plugin }: { plugin: FileOrganizer }) {
  const [files, setFiles] = useState<RemoteFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(
    new Set()
  );
  const [syncingAll, setSyncingAll] = useState(false);
  const [previewCache, setPreviewCache] = useState<PreviewCache>({});
  const [loadingPreviews, setLoadingPreviews] = useState<Record<string, boolean>>({});

  // Load downloaded files from local storage
  useEffect(() => {
    const loadDownloadedFiles = () => {
      try {
        const savedFiles = localStorage.getItem(DOWNLOADED_FILES_KEY);
        if (savedFiles) {
          setDownloadedFiles(new Set(JSON.parse(savedFiles)));
        }
      } catch (err) {
        console.error("Error loading downloaded files", err);
      }
    };

    loadDownloadedFiles();
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [page, plugin]);

  async function fetchFiles() {
    if (!plugin.settings.API_KEY) {
      setError("API key not found. Please set your API key in settings.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await makeApiRequest<PaginatedResponse>(() =>
        requestUrl({
          url: `${plugin.getServerUrl()}/api/files?page=${page}`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${plugin.settings.API_KEY}`,
          },
        })
      );

      setFiles(response.files);
      setTotalPages(response.pagination.totalPages);
      setLoading(false);
      
      // After loading files, fetch previews for any binary files
      for (const file of response.files) {
        if (file.status === "completed" && 
            (file.fileType.startsWith('image/') || file.fileType === 'application/pdf')) {
          fetchPreview(file);
        }
      }
    } catch (err) {
      setError(
        "Failed to fetch files: " +
          (err instanceof Error ? err.message : String(err))
      );
      setLoading(false);
    }
  }
  
  // Fetch preview for binary files (images and PDFs)
  const fetchPreview = async (file: RemoteFile) => {
    // Skip if not a previewable file or already in cache
    if (previewCache[file.id] || file.status !== "completed") {
      return;
    }
    
    // Only load previews for images and PDFs
    const isImage = file.fileType.startsWith('image/');
    const isPDF = file.fileType === 'application/pdf';
    
    if (!isImage && !isPDF) {
      return;
    }
    
    // Set loading state
    setLoadingPreviews(prev => ({ ...prev, [file.id]: true }));
    
    try {
      // Fetch the binary file
      const response = await requestUrl({
        url: file.blobUrl,
        method: "GET"
      });
      
      // Convert to data URL
      let dataUrl = '';
      
      if (isImage) {
        // For images, create a data URL
        const blob = new Blob([response.arrayBuffer], { type: file.fileType });
        dataUrl = await blobToDataUrl(blob);
      } else if (isPDF) {
        // For PDFs, we'll just use a PDF icon or first page if possible
        dataUrl = 'pdf'; // Just a marker that we have the PDF
      }
      
      // Update cache
      setPreviewCache(prev => ({
        ...prev,
        [file.id]: {
          url: file.blobUrl,
          dataUrl
        }
      }));
    } catch (err) {
      console.error(`Error fetching preview for file ${file.id}:`, err);
    } finally {
      setLoadingPreviews(prev => ({ ...prev, [file.id]: false }));
    }
  };
  
  // Helper to convert Blob to data URL
  const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Mark a file as downloaded
  const markFileAsDownloaded = (fileId: string) => {
    const newDownloadedFiles = new Set(downloadedFiles);
    newDownloadedFiles.add(fileId);
    setDownloadedFiles(newDownloadedFiles);

    // Save to localStorage
    try {
      localStorage.setItem(
        DOWNLOADED_FILES_KEY,
        JSON.stringify([...newDownloadedFiles])
      );
    } catch (err) {
      console.error("Error saving downloaded files", err);
    }
  };

  // Clear download history
  const clearDownloadHistory = () => {
    if (
      confirm(
        "Are you sure you want to clear your download history? This won't delete any files from your vault, but will reset the 'synced' status for all files."
      )
    ) {
      setDownloadedFiles(new Set());
      localStorage.removeItem(DOWNLOADED_FILES_KEY);
      new Notice("Download history cleared");
    }
  };

  // Download all undownloaded files
  const downloadAllMissingFiles = async () => {
    if (syncingAll) return;

    try {
      setSyncingAll(true);

      // Find all completed files that haven't been downloaded
      const filesToDownload = files.filter(
        file => file.status === "completed" && !downloadedFiles.has(file.id)
      );

      if (filesToDownload.length === 0) {
        new Notice("All files are already synchronized");
        return;
      }

      new Notice(`Syncing ${filesToDownload.length} file(s)...`);

      // Download each file one by one
      for (const file of filesToDownload) {
        if (!downloading[file.id]) {
          await downloadFile(file);
        }
      }

      new Notice(`Successfully synchronized ${filesToDownload.length} file(s)`);
    } catch (err) {
      new Notice(
        `Error during bulk sync: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      console.error("Bulk sync error:", err);
    } finally {
      setSyncingAll(false);
    }
  };

  async function downloadFile(file: RemoteFile) {
    if (downloading[file.id]) return;

    setDownloading(prev => ({ ...prev, [file.id]: true }));

    try {
      // Determine destination folder - use the dedicated sync folder
      const folderPath =
        plugin.settings.syncFolderPath || "_NoteCompanion/Sync";

      try {
        await plugin.ensureFolderExists(folderPath);
      } catch (err) {
        new Notice(`Failed to create sync folder: ${folderPath}`);
        throw err;
      }

      // Fetch file content from blob URL
      const fileResponse = await requestUrl({
        url: file.blobUrl,
        method: "GET",
      });

      // Create a sanitized filename
      const sanitizedFilename = file.originalName.replace(/[\\/:*?"<>|]/g, "_");
      const isImage = file.fileType.startsWith("image/");
      const isPDF = file.fileType === "application/pdf";

      // Create a date-based subfolder to organize downloads
      const today = new Date();
      const dateFolder = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const dateFolderPath = `${folderPath}/${dateFolder}`;

      try {
        await plugin.ensureFolderExists(dateFolderPath);
      } catch (err) {
        new Notice(`Failed to create date folder: ${dateFolderPath}`);
        throw err;
      }

      if (isImage || isPDF) {
        // Binary file handling
        const binaryPath = `${dateFolderPath}/${sanitizedFilename}`;

        try {
          await plugin.app.vault.createBinary(
            binaryPath,
            fileResponse.arrayBuffer
          );

          // Create a markdown file that references the image
          const fileExtension = sanitizedFilename.split(".").pop();
          const baseName = sanitizedFilename.split(".").slice(0, -1).join(".");
          const markdownContent = `# ${baseName}\n\n![[${dateFolder}/${sanitizedFilename}]]\n\n${
            file.textContent || ""
          }`;

          const mdFilePath = `${dateFolderPath}/${baseName}.md`;
          await plugin.app.vault.create(mdFilePath, markdownContent);

          // Mark as downloaded
          markFileAsDownloaded(file.id);

          new Notice(`Downloaded ${sanitizedFilename} to ${dateFolderPath}`);
        } catch (err) {
          new Notice(`Failed to save file: ${sanitizedFilename}`);
          throw err;
        }
      } else {
        // Text/markdown file handling
        try {
          let content = file.textContent || "";

          // If it's not already a markdown file, add the .md extension
          let finalName = sanitizedFilename;
          if (!finalName.endsWith(".md")) {
            finalName = `${sanitizedFilename}.md`;
          }

          await plugin.app.vault.create(
            `${dateFolderPath}/${finalName}`,
            content
          );

          // Mark as downloaded
          markFileAsDownloaded(file.id);

          new Notice(`Downloaded ${finalName} to ${dateFolderPath}`);
        } catch (err) {
          new Notice(`Failed to save file: ${sanitizedFilename}`);
          throw err;
        }
      }
    } catch (err) {
      new Notice(
        `Error downloading file: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      console.error("Download error:", err);
    } finally {
      setDownloading(prev => ({ ...prev, [file.id]: false }));
    }
  }

  // Get appropriate icon based on file type
  function getFileIcon(fileType: string, className = "w-4 h-4") {
    if (fileType.startsWith("image/")) {
      return <FileImage className={className} />;
    } else if (fileType === "application/pdf") {
      return <FileImage className={className} />;
    } else {
      return <FileText className={className} />;
    }
  }

  function getStatusBadge(status: string) {
    // Base styles for status badges with consistent sizing and rounded corners
    let className =
      "px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors duration-200";
    let icon = null;

    switch (status) {
      case "completed":
        className +=
          " bg-[--text-success] text-[--text-on-accent] border border-[--background-modifier-border]";
        icon = <Check className="w-3 h-3" />;
        break;
      case "processing":
        className += " bg-[--interactive-accent] text-[--text-on-accent] border border-[--background-modifier-border]";
        icon = <RotateCw className="w-3 h-3 animate-spin" />;
        break;
      case "pending":
        className += " bg-[--text-warning] text-[--text-on-accent] border border-[--background-modifier-border]";
        icon = <Clock className="w-3 h-3" />;
        break;
      case "error":
        className += " bg-[--text-error] text-[--text-on-accent] border border-[--background-modifier-border]";
        icon = <AlertCircle className="w-3 h-3" />;
        break;
      default:
        className += " bg-[--background-secondary] text-[--text-muted] border border-[--background-modifier-border]";
        icon = <Cloud className="w-3 h-3" />;
    }

    // Return a badge with icon and text
    return (
      <span className={className}>
        {icon}
        <span>{status}</span>
      </span>
    );
  }

  return (
    <StyledContainer className={tw("bg-[--background-primary] h-full flex flex-col")}>
      {/* Header with icon-only tools */}
      <div className={tw("px-3 py-1.5 border-b border-[--background-modifier-border] flex items-center justify-between")}>
        <div>
          <h2 className={tw("text-sm font-medium text-[--text-normal]")}>Sync Files</h2>
          <p className={tw("text-xs text-[--text-muted]")}>
            {files.filter(f => downloadedFiles.has(f.id)).length} of {files.length} synced
          </p>
        </div>
        
        {/* Icon-only tools */}
        <div className={tw("flex items-center gap-2")}>
          <button
            onClick={fetchFiles}
            disabled={loading}
            className={tw(`p-1.5 text-[--text-muted] hover:text-[--text-normal] transition-colors ${loading ? 'cursor-wait' : ''}`)}
            title="Refresh file list"
          >
            <RefreshCw className={tw(`w-4 h-4 ${loading ? 'animate-spin' : ''}`)} />
          </button>
          
          <button
            onClick={downloadAllMissingFiles}
            disabled={loading || syncingAll || files.filter(f => f.status === 'completed' && !downloadedFiles.has(f.id)).length === 0}
            className={tw(`p-1.5 transition-colors ${
              files.filter(f => f.status === 'completed' && !downloadedFiles.has(f.id)).length > 0
                ? 'text-[--interactive-accent] hover:text-[--interactive-accent-hover]'
                : 'text-[--text-muted] cursor-not-allowed'
            }`)}
            title={`Sync all (${files.filter(f => f.status === 'completed' && !downloadedFiles.has(f.id)).length})`}
          >
            <DownloadCloud className={tw(`w-4 h-4 ${syncingAll ? 'animate-pulse' : ''}`)} />
          </button>
          
          {downloadedFiles.size > 0 && (
            <button
              onClick={clearDownloadHistory}
              className={tw("text-xs text-[--text-muted] hover:text-[--text-error] transition-colors px-2")}
              title="Clear sync history"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* File list - compact rows */}
      <div className={tw("flex-1 overflow-y-auto")}>
      

      {error && (
        <div className={tw("px-3 py-2 bg-[--background-modifier-error] border-l-2 border-[--text-error]")}>
          <div className={tw("flex items-center gap-2 text-sm text-[--text-error]")}>
            <AlertCircle className={tw("w-4 h-4")} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className={tw("border-t border-[--background-modifier-border]")}>
          {[1, 2, 3].map(i => (
            <div key={i} className={tw("flex items-center px-3 py-2 border-b border-[--background-modifier-border] animate-pulse")}>
              <div className={tw("w-6 h-6 mr-3 bg-[--background-modifier-border]")}></div>
              <div className={tw("flex-1")}>
                <div className={tw("h-4 bg-[--background-modifier-border] w-2/3")}></div>
              </div>
              <div className={tw("h-3 bg-[--background-modifier-border] w-16 mr-4")}></div>
              <div className={tw("w-4 h-4 bg-[--background-modifier-border]")}></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {files.length === 0 ? (
            <div className={tw("flex flex-col items-center justify-center py-12 text-center")}>
              <Cloud className={tw("w-12 h-12 text-[--text-faint] mb-4")} />
              <p className={tw("text-sm text-[--text-muted]")}>
                No files yet. Upload via mobile or web app.
              </p>
            </div>
          ) : (
            <div className={tw("border-t border-[--background-modifier-border]")}>
              {files.map(file => (
                <div
                  key={file.id}
                  onClick={() => file.status === 'completed' && !downloading[file.id] && downloadFile(file)}
                  className={tw(`flex items-center px-3 py-2 border-b border-[--background-modifier-border] transition-colors group ${
                    file.status === 'completed' && !downloading[file.id]
                      ? 'cursor-pointer hover:bg-[--background-modifier-hover]'
                      : 'cursor-default'
                  }`)}
                >
                  {/* Icon/Thumbnail (24x24) */}
                  <div className={tw("w-6 h-6 mr-3 flex-shrink-0 overflow-hidden")}>
                    {file.fileType.startsWith('image/') && file.previewUrl ? (
                      <img 
                        src={file.previewUrl} 
                        alt={file.originalName}
                        className={tw("w-full h-full object-cover")}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={tw("flex items-center justify-center w-full h-full")}
                      style={{ display: file.fileType.startsWith('image/') && file.previewUrl ? 'none' : 'flex' }}
                    >
                      {getFileIcon(file.fileType, tw("w-4 h-4 text-[--text-muted]"))}
                    </div>
                  </div>
                  
                  {/* Filename */}
                  <div className={tw("flex-1 min-w-0")}>
                    <span className={tw("text-sm text-[--text-normal] truncate block")}>
                      {file.originalName}
                    </span>
                  </div>
                  
                  {/* Date */}
                  <div className={tw("text-xs text-[--text-faint] mr-4 flex-shrink-0")}>
                    {new Date(file.createdAt).toLocaleDateString()}
                  </div>
                  
                  {/* Status icon */}
                  <div className={tw("w-5 h-5 flex items-center justify-center flex-shrink-0")}>
                    {downloading[file.id] ? (
                      <DownloadCloud className={tw("w-4 h-4 text-[--text-muted] animate-pulse")} />
                    ) : downloadedFiles.has(file.id) ? (
                      <Check className={tw("w-4 h-4 text-[--text-success]")} />
                    ) : file.status === 'completed' ? (
                      <Download className={tw("w-4 h-4 text-[--text-muted] opacity-0 group-hover:opacity-100 transition-opacity")} />
                    ) : (
                      <Clock className={tw("w-4 h-4 text-[--text-warning]")} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className={tw("flex justify-between items-center mt-8 bg-[--background-primary] border border-[--background-modifier-border] p-4")}>
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={tw(`px-4 py-2 h-auto transition-colors duration-200 flex items-center gap-2 ${
                  page === 1 
                    ? "bg-[--background-secondary] text-[--text-faint] cursor-not-allowed" 
                    : "bg-[--background-primary] border border-[--background-modifier-border] hover:bg-[--background-secondary] text-[--text-normal]"
                }`)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={tw("w-4 h-4")}>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span>Previous</span>
              </Button>
              
              <div className={tw("bg-[--background-secondary] border border-[--background-modifier-border] px-4 py-2 text-sm font-medium text-[--text-normal]")}>
                Page {page} of {totalPages}
              </div>
              
              <Button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={tw(`px-4 py-2 h-auto transition-colors duration-200 flex items-center gap-2 ${
                  page === totalPages 
                    ? "bg-[--background-secondary] text-[--text-faint] cursor-not-allowed" 
                    : "bg-[--background-primary] border border-[--background-modifier-border] hover:bg-[--background-secondary] text-[--text-normal]"
                }`)}
              >
                <span>Next</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={tw("w-4 h-4")}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Button>
            </div>
          )}
        </>
      )}
      </div>
    </StyledContainer>
  );
}
