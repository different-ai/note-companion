import { create } from "zustand";
import { App, TFile } from "obsidian";
import { Vault } from "obsidian";

// Base types
interface BaseContextItem {
  id: string;
  reference: string;
  createdAt: number;
}

// Specific item types
interface FileContextItem extends BaseContextItem {
  type: "file";
  path: string;
  title: string;
  content: string;
}

interface ProcessedFile {
  path: string;
  content: string;
}

interface FolderContextItem extends BaseContextItem {
  type: "folder";
  path: string;
  name: string;
  files: ProcessedFile[];
}

interface YouTubeContextItem extends BaseContextItem {
  type: "youtube";
  videoId: string;
  title: string;
  transcript: string;
}

interface TagContextItem extends BaseContextItem {
  type: "tag";
  name: string;
  files: ProcessedFile[];
}



// Add new search result type
interface SearchContextItem extends BaseContextItem {
  type: "search";
  query: string;
  results: Array<{
    path: string;
    title: string;
    content: string;
  }>;
}

// Add new type for text selection
interface TextSelectionContextItem extends BaseContextItem {
  type: "text-selection";
  content: string;
  sourceFile?: string;
}

type ContextCollections = {
  files: Record<string, FileContextItem>;
  folders: Record<string, FolderContextItem>;
  youtubeVideos: Record<string, YouTubeContextItem>;
  tags: Record<string, TagContextItem>;

  searchResults: Record<string, SearchContextItem>;
  textSelections: Record<string, TextSelectionContextItem>;
};

interface ContextItemsState extends ContextCollections {
  currentFile: FileContextItem | null;
  includeCurrentFile: boolean;
  isLightweightMode: boolean;

  // Actions for each type
  addFile: (file: FileContextItem) => void;
  addFolder: (folder: FolderContextItem) => void;
  addYouTubeVideo: (video: YouTubeContextItem) => void;
  addTag: (tag: TagContextItem) => void;

  addSearchResults: (search: SearchContextItem) => void;
  addTextSelection: (selection: TextSelectionContextItem) => void;

  // Generic actions
  removeItem: (type: ContextItemType, id: string) => void;
  setCurrentFile: (file: FileContextItem | null) => void;
  toggleCurrentFile: () => void;
  clearAll: () => void;
  toggleLightweightMode: () => void;

  // Processing methods
  processFolderFiles: (
    app: App,
    folderPath: string
  ) => Promise<ProcessedFile[]>;
  processTaggedFiles: (app: App, tagName: string) => Promise<ProcessedFile[]>;

  // Helper function to check and remove existing items with same reference
  removeByReference: (reference: string) => void;
}

export const useContextItems = create<ContextItemsState>((set, get) => ({
  // Initial state
  files: {},
  folders: {},
  youtubeVideos: {},
  tags: {},
  screenpipe: {},
  searchResults: {},
  textSelections: {},
  currentFile: null,
  includeCurrentFile: true,
  isLightweightMode: false,

  // Add toggle function
  toggleLightweightMode: () => set(state => ({ isLightweightMode: !state.isLightweightMode })),

  // Update addFile to handle lightweight mode
  addFile: file =>
    set(state => {
      const existingItemIndex = Object.values(state.files).findIndex(
        item => item.reference === file.reference
      );

      const lightweightFile = state.isLightweightMode ? {
        ...file,
        content: '', // Remove content in lightweight mode
      } : file;

      if (existingItemIndex !== -1) {
        return {
          files: {
            ...state.files,
            [file.id]: { ...lightweightFile, createdAt: Date.now() },
          },
        };
      }

      return {
        files: { ...state.files, [file.id]: lightweightFile },
      };
    }),

  // Update addFolder to handle lightweight mode
  addFolder: folder =>
    set(state => {
      const existingItemIndex = Object.values(state.folders).findIndex(
        item => item.reference === folder.reference
      );

      const lightweightFolder = state.isLightweightMode ? {
        ...folder,
        files: folder.files.map(f => ({ ...f, content: '' })), // Remove content in lightweight mode
      } : folder;

      if (existingItemIndex !== -1) {
        return {
          folders: {
            ...state.folders,
            [folder.id]: { ...lightweightFolder, createdAt: Date.now() },
          },
        };
      }

      return {
        folders: { ...state.folders, [folder.id]: lightweightFolder },
      };
    }),

  // Add YouTube video without lightweight mode
  addYouTubeVideo: video =>
    set(state => ({
      youtubeVideos: { ...state.youtubeVideos, [video.id]: video },
    })),



  // Update addTag to handle lightweight mode
  addTag: tag =>
    set(state => {
      const lightweightTag = state.isLightweightMode ? {
        ...tag,
        files: tag.files.map(f => ({ ...f, content: '' })), // Remove content in lightweight mode
      } : tag;

      return {
        tags: { ...state.tags, [tag.id]: lightweightTag },
      };
    }),

  // Update addSearchResults to handle lightweight mode
  addSearchResults: search =>
    set(state => {
      const lightweightSearch = state.isLightweightMode ? {
        ...search,
        results: search.results.map(r => ({ ...r, content: '' })), // Remove content in lightweight mode
      } : search;

      return {
        searchResults: { ...state.searchResults, [search.id]: lightweightSearch },
      };
    }),

  // Add text selection without lightweight mode
  addTextSelection: selection =>
    set(state => {
      const reference = selection.reference;
      get().removeByReference(reference);
      
      return {
        textSelections: { 
          ...state.textSelections, 
          [selection.id]: selection 
        },
      };
    }),

  // Remove action
  removeItem: (type, id) =>
    set(state => {
      const collectionMap: Record<ContextItemType, keyof ContextCollections> = {
        file: "files",
        folder: "folders",
        youtube: "youtubeVideos",
        tag: "tags",

        search: "searchResults",
        "text-selection": "textSelections",
      };

      const collectionKey = collectionMap[type];
      const collection = { ...state[collectionKey] };
      delete collection[id];

      return { [collectionKey]: collection } as Partial<ContextCollections>;
    }),

  setCurrentFile: file =>
    set({ currentFile: file ? { ...file, reference: "Current File", type: "file" } : null }),

  toggleCurrentFile: () =>
    set(state => ({
      currentFile: null,
    })),

  clearAll: () =>
    set({
      files: {},
      folders: {},
      youtubeVideos: {},
      tags: {},
      searchResults: {},
      textSelections: {},
      includeCurrentFile: false,
      currentFile: null,
    }),

  // Add new processing methods
  processFolderFiles: async (app, folderPath) => {
    const folderRef = app.vault.getFolderByPath(folderPath);
    if (!folderRef) return [];

    const files: TFile[] = [];
    Vault.recurseChildren(folderRef, file => {
      if (file instanceof TFile) {
        files.push(file);
      }
    });

    return Promise.all(
      files.map(async file => ({
        path: file.path,
        content: await app.vault.cachedRead(file),
      }))
    );
  },

  processTaggedFiles: async (app, tagName) => {
    const taggedFiles = app.vault.getFiles().filter(file => {
      const cache = app.metadataCache.getFileCache(file);
      return cache?.tags?.some(t => t.tag === `#${tagName}`);
    });

    return Promise.all(
      taggedFiles.map(async file => ({
        path: file.path,
        content: await app.vault.cachedRead(file),
      }))
    );
  },

  // Helper function to check and remove existing items with same reference
  removeByReference: (reference: string) =>
    set(state => {
      const collections: (keyof ContextCollections)[] = [
        "files",
        "folders",
        "youtubeVideos",
        "tags",

        "searchResults",
        "textSelections",
      ];

      const newState = { ...state };

      collections.forEach(collection => {
        const items = state[collection];
        Object.entries(items).forEach(([id, item]) => {
          if (item.reference === reference) {
            delete newState[collection][id];
          }
        });
      });

      return newState;
    }),
}));

// Updated helper functions
export const addFileContext = (file: {
  path: string;
  title: string;
  content: string;
}) => {
  const store = useContextItems.getState();
  const reference = `File: ${file.path}`;

  // Remove any existing items with same reference first
  store.removeByReference(reference);

  store.addFile({
    id: file.path,
    type: "file",
    path: file.path,
    title: file.title,
    content: file.content,
    reference,
    createdAt: Date.now(),
  });
};

export const addYouTubeContext = (video: {
  videoId: string;
  title: string;
  transcript: string;
}) => {
  useContextItems.getState().addYouTubeVideo({
    id: `youtube-${video.videoId}`,
    type: "youtube",
    videoId: video.videoId,
    title: video.title,
    transcript: video.transcript,
    reference: `YouTube Video: ${video.title}`,
    createdAt: Date.now(),
  });
};

export const addFolderContext = async (
  folderPath: string,
  app: App
): Promise<void> => {
  const store = useContextItems.getState();
  const files = await store.processFolderFiles(app, folderPath);
  const reference = `Folder: ${folderPath}`;

  // Remove any existing items with same reference first
  store.removeByReference(reference);

  store.addFolder({
    id: folderPath,
    type: "folder",
    path: folderPath,
    name: folderPath.split("/").pop() || folderPath,
    reference,
    createdAt: Date.now(),
    files,
  });
};

export const addTagContext = async (
  tagName: string,
  app: App
): Promise<void> => {
  const store = useContextItems.getState();
  const files = await store.processTaggedFiles(app, tagName);

  store.addTag({
    id: `tag-${tagName}`,
    type: "tag",
    name: tagName,
    reference: `Tag: ${tagName}`,
    createdAt: Date.now(),
    files, // Store processed files with the tag
  });
};



export const addSearchContext = (
  query: string,
  results: Array<{ path: string; title: string; content: string }>
) => {
  useContextItems.getState().addSearchResults({
    id: `search-${Date.now()}`,
    type: "search",
    query,
    results,
    reference: `Search: "${query}"`,
    createdAt: Date.now(),
  });
};

export const addTextSelectionContext = (params: {
  content: string;
  sourceFile?: string;
}) => {
  const store = useContextItems.getState();
  const reference = `Selection: ${params.content.slice(0, 30)}...`;

  store.addTextSelection({
    id: `text-selection-${Date.now()}`,
    type: "text-selection",
    content: params.content,
    sourceFile: params.sourceFile,
    reference,
    createdAt: Date.now(),
  });
};

// Add export for types
export type ContextItemType =
  | "file"
  | "folder"
  | "youtube"
  | "tag"

  | "search"
  | "text-selection";
export type {
  FileContextItem,
  FolderContextItem,
  YouTubeContextItem,
  TagContextItem,

  BaseContextItem,
  SearchContextItem,
  ProcessedFile,
  TextSelectionContextItem,
};

// Add this helper function
export const getUniqueReferences = () => {
  const store = useContextItems.getState();
  const collections = {
    files: store.files,
    folders: store.folders,
    youtubeVideos: store.youtubeVideos,
    tags: store.tags,

    searchResults: store.searchResults,
    textSelections: store.textSelections,
  };

  const references = new Set<string>();

  Object.values(collections).forEach(collection => {
    Object.values(collection).forEach(item => {
      references.add(item.reference);
    });
  });
  const referencesArray = Array.from(references);
  if (store.currentFile) {
    referencesArray.push(store.currentFile.reference);
  }
  return referencesArray;
};
