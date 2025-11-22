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
      let folder: TFolder;

      try {
        folder = await plugin.ensureFolderExists(folderPath);
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
          " bg-emerald-50 text-emerald-700 border border-emerald-200";
        icon = <Check className="w-3 h-3" />;
        break;
      case "processing":
        className += " bg-indigo-50 text-indigo-700 border border-indigo-200";
        icon = <RotateCw className="w-3 h-3 animate-spin" />;
        break;
      case "pending":
        className += " bg-amber-50 text-amber-700 border border-amber-200";
        icon = <Clock className="w-3 h-3" />;
        break;
      case "error":
        className += " bg-rose-50 text-rose-700 border border-rose-200";
        icon = <AlertCircle className="w-3 h-3" />;
        break;
      default:
        className += " bg-slate-100 text-slate-700 border border-slate-200";
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
      {/* Header - compact, flush */}
      <div className={tw("px-3 py-2 border-b border-[--background-modifier-border]")}>
        <SectionHeader text="Sync Files" icon="📥" />
        <p className={tw("text-[--text-muted] text-xs px-3")}>
          Sync files from Note Companion web and mobile
        </p>
      </div>

      {/* Scrollable content */}
      <div className={tw("flex-1 overflow-y-auto")}>
      

      <div className={tw("bg-[--background-secondary] border border-[--background-modifier-border] rounded-lg p-6 mb-6 shadow-sm")}>
        <div className={tw("flex gap-3 items-start mb-4")}>
          <div className={tw("bg-[--interactive-accent-hover] p-2 rounded-full mt-0.5")}>
            <Cloud className={tw("w-5 h-5 text-[--interactive-accent]")} />
          </div>
          <div>
            <h3 className={tw("font-medium text-lg text-[--text-normal] mb-2")}>
              How Sync Works
            </h3>
            <p className={tw("text-sm leading-relaxed mb-3 text-[--text-muted]")}>
              Sync allows you to download files uploaded through the Note
              Companion mobile app or web interface.
            </p>

            <ol className={tw("list-none pl-0 mb-4")}>
              <li className={tw("flex items-start gap-2 mb-3")}>
                <div className={tw("bg-[--interactive-accent-hover] text-[--interactive-accent] rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5")}>
                  1
                </div>
                <p className={tw("text-sm m-0 text-[--text-muted]")}>
                  Upload files using the Note Companion mobile app or web app
                </p>
              </li>
              <li className={tw("flex items-start gap-2 mb-3")}>
                <div className={tw("bg-[--interactive-accent-hover] text-[--interactive-accent] rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5")}>
                  2
                </div>
                <p className={tw("text-sm m-0 text-[--text-muted]")}>
                  Files will appear here after processing
                </p>
              </li>
              <li className={tw("flex items-start gap-2 mb-3")}>
                <div className={tw("bg-[--interactive-accent-hover] text-[--interactive-accent] rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5")}>
                  3
                </div>
                <p className={tw("text-sm m-0 text-[--text-muted]")}>
                  Download files directly to your Obsidian vault
                </p>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {error && (
        <div className={tw("bg-[--background-secondary] border border-[--background-modifier-error] shadow-sm text-[--text-error] p-5 rounded-lg mb-6 flex items-start gap-3")}>
          <AlertCircle className={tw("w-5 h-5 flex-shrink-0 mt-0.5")} />
          <div>
            <p className={tw("font-medium mb-3")}>{error}</p>
            <Button
              className={tw("bg-[--interactive-accent] hover:bg-[--interactive-accent-hover] transition-colors duration-200")}
              onClick={fetchFiles}
            >
              <RefreshCw className={tw("w-4 h-4 mr-2")} /> Retry
            </Button>
          </div>
        </div>
      )}

      <div className={tw("bg-[--background-secondary] border border-[--background-modifier-border] rounded-lg p-5 shadow-sm mb-6")}>
        <div className={tw("flex flex-col md:flex-row md:justify-between md:items-center gap-4")}>
          <div className={tw("flex gap-3")}>
            <Button 
              onClick={fetchFiles} 
              disabled={loading}
              className={tw("bg-[--interactive-accent] hover:bg-[--interactive-accent-hover] transition-colors duration-200 shadow-sm px-4 py-2 h-auto rounded-lg flex items-center gap-2")}
            >
              {loading ? (
                <>
                  <RefreshCw className={tw("w-4 h-4 animate-spin")} />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <RefreshCw className={tw("w-4 h-4")} />
                  <span>Refresh</span>
                </>
              )}
            </Button>
            
            <Button 
              onClick={downloadAllMissingFiles} 
              disabled={
                loading ||
                syncingAll ||
                files.filter(
                  f => f.status === "completed" && !downloadedFiles.has(f.id)
                ).length === 0
              }
              className={tw(`transition-colors duration-200 shadow-sm px-4 py-2 h-auto rounded-lg flex items-center gap-2 ${
                loading || syncingAll || files.filter(f => f.status === 'completed' && !downloadedFiles.has(f.id)).length === 0
                ? "bg-[--background-secondary] text-[--text-muted]"
                : "bg-[--interactive-accent] hover:bg-[--interactive-accent-hover] text-white"
              }`)}
            >
              {syncingAll ? (
                <>
                  <DownloadCloud className={tw("w-4 h-4 animate-pulse")} />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className={tw("w-4 h-4")} />
                  <span>Sync All New Files</span>
                </>
              )}
            </Button>
          </div>
          
          {files.length > 0 && !loading && (
            <div className={tw("flex items-center bg-[--background-primary-alt] px-4 py-2 rounded-lg flex-wrap")}>
              <div className={tw("text-sm text-[--text-muted] font-medium mr-3 flex items-center")}>
                <Check className={tw("w-4 h-4 text-[--text-success] mr-2")} />
                <span>{files.filter(f => downloadedFiles.has(f.id)).length} of {files.length} files synced</span>
              </div>
              {downloadedFiles.size > 0 && (
                <button 
                  onClick={clearDownloadHistory}
                  className={tw("text-xs text-[--text-error] hover:text-[--text-error] transition-colors duration-200 border border-[--background-modifier-error] rounded-md px-2 py-1 hover:bg-[--background-modifier-error-hover]")}
                >
                  Clear History
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="h-5 bg-slate-200 rounded-md w-48 mb-2"></div>
                  <div className="h-4 bg-slate-100 rounded-md w-36"></div>
                </div>
                <div className="h-6 bg-slate-200 rounded-full w-20"></div>
              </div>
              <div className="border-t border-slate-100 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <div className="h-9 bg-slate-200 rounded-md w-28"></div>
                  <div className="h-4 bg-slate-100 rounded-md w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {files.length === 0 ? (
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-8 text-center">
              <div className="inline-flex justify-center items-center w-16 h-16 bg-indigo-50 rounded-full mb-4">
                <Cloud className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-slate-800 font-medium text-lg mb-3">
                No synced files found
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                To see files here, upload documents using Note Companion
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left flex flex-col">
                  <span className="text-sm font-medium text-slate-700 mb-2">Mobile App</span>
                  <span className="text-xs text-slate-500">Upload files from your phone or tablet</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left flex flex-col">
                  <span className="text-sm font-medium text-slate-700 mb-2">Web App</span>
                  <span className="text-xs text-slate-500">Visit notecompanion.ai to upload files</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Files will appear here once uploaded and processed
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {files.map(file => (
                <div
                  key={file.id}
                  className={`bg-white border shadow-sm rounded-lg overflow-hidden transition-all duration-200 ${
                    downloadedFiles.has(file.id)
                      ? "border-indigo-200 shadow-indigo-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start">
                      <div className="flex">
                        {/* Show preview for images or loading state */}
                        {loadingPreviews[file.id] ? (
                          <div className="w-12 h-12 mr-3 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-50 animate-pulse">
                            <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                          </div>
                        ) : file.fileType.startsWith('image/') && previewCache[file.id] ? (
                          <div className="w-12 h-12 mr-3 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200">
                            <img 
                              src={previewCache[file.id].dataUrl} 
                              alt={file.originalName} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : file.fileType === 'application/pdf' && previewCache[file.id] ? (
                          <div className="w-12 h-12 mr-3 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                            <div className="bg-rose-100 p-1 rounded">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-6 h-6 text-rose-700">
                                <path fill="currentColor" d="M320 464c8.8 0 16-7.2 16-16V160H256c-17.7 0-32-14.3-32-32V48H64c-8.8 0-16 7.2-16 16V448c0 8.8 7.2 16 16 16H320zM0 64C0 28.7 28.7 0 64 0H229.5c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64z"/>
                              </svg>
                            </div>
                          </div>
                        ) : (file.fileType.startsWith('image/') || file.fileType === 'application/pdf') && file.status === "completed" ? (
                          <div 
                            className="w-12 h-12 mr-3 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors duration-200"
                            onClick={() => fetchPreview(file)}
                            title="Load preview"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-500">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M8 12h8" />
                              <path d="M12 8v8" />
                            </svg>
                          </div>
                        ) : (
                          <div className={`p-2 rounded-lg mr-3 flex-shrink-0 ${
                            downloadedFiles.has(file.id) ? 'bg-indigo-50' : 'bg-slate-50'
                          }`}>
                            {getFileIcon(file.fileType, "w-5 h-5 text-slate-700")}
                          </div>
                        )}
                        
                        <div>
                          <div className="flex items-center mb-1">
                            <h3 className="font-medium text-slate-800">{file.originalName}</h3>
                            {downloadedFiles.has(file.id) && (
                              <span className="ml-2 px-2 py-0.5 bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs rounded-full flex items-center">
                                <Check className="w-3 h-3 mr-1" />
                                Synced
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 flex items-center">
                            <span className="mr-3">{new Date(file.createdAt).toLocaleString()}</span>
                            <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                              {file.fileType.split('/')[1] || file.fileType}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div>{getStatusBadge(file.status)}</div>
                    </div>

                    <div className="border-t border-slate-100 mt-4 pt-4 flex justify-between items-center">
                      <Button
                        onClick={() => downloadFile(file)}
                        disabled={file.status !== "completed" || downloading[file.id]}
                        className={`px-4 py-2 h-auto rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-sm ${
                          file.status !== "completed" || downloading[file.id]
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : downloadedFiles.has(file.id)
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        }`}
                      >
                        {downloading[file.id] ? (
                          <>
                            <DownloadCloud className="w-4 h-4 animate-pulse" />
                            <span>Downloading...</span>
                          </>
                        ) : downloadedFiles.has(file.id) ? (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Download Again</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </>
                        )}
                      </Button>
                      
                      <div className="text-xs text-slate-500 flex items-center">
                        {file.status === "completed" && (
                          <span className="text-emerald-600 flex items-center">
                            <Check className="w-3 h-3 mr-1" />
                            Ready to download
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-8 bg-white border border-slate-200 shadow-sm rounded-lg p-4">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-4 py-2 h-auto rounded-lg transition-colors duration-200 flex items-center gap-2 
                  ${page === 1 
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                    : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span>Previous</span>
              </Button>
              
              <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium text-slate-700">
                Page {page} of {totalPages}
              </div>
              
              <Button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-4 py-2 h-auto rounded-lg transition-colors duration-200 flex items-center gap-2 
                  ${page === totalPages 
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                    : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
              >
                <span>Next</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
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
