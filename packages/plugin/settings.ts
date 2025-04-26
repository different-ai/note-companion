export class FileOrganizerSettings {
  
  API_KEY = "";
  isLicenseValid = false;
  useLogs = true;
  defaultDestinationPath = "_NoteCompanion/Processed";
  referencePath = "_NoteCompanion/References";
  attachmentsPath = "_NoteCompanion/Processed/Attachments";
  pathToWatch = "_NoteCompanion/Inbox";
  logFolderPath = "_NoteCompanion/Logs";
  backupFolderPath = "_NoteCompanion/Backups";
  templatePaths = "_NoteCompanion/Templates";
  fabricPaths = "_NoteCompanion/Fabric";
  bypassedFilePath = "_NoteCompanion/Bypassed";
  errorFilePath = "_NoteCompanion/Errors";
  syncFolderPath = "_NoteCompanion/Sync";

  // inbox settings
  useSimilarTags = true;
  enableDocumentClassification = false;
  // not working atm
  enableFileRenaming = true;

  renameInstructions =
    "If document has a human readable name, use it. Otherwise, create a concise, descriptive name for the document based on its key content. Prioritize clarity and searchability, using specific terms that will make the document easy to find later. Avoid generic words and focus on unique, identifying elements.";
  usePro = true;
  useSimilarTagsInFrontmatter = false;
  enableAtomicNotes = false;
  ignoreFolders = [""];
  stagingFolder = ".notecompanion/staging";
  enableSelfHosting = false;
  selfHostingURL = "http://localhost:3000";
  enableScreenpipe = false;
  enableFabric = false;
  useFolderEmbeddings = false;
  useVaultTitles = true;
  enableSearchGrounding = false;
  enableDeepSearch = false;
  showLocalLLMInChat = false;
  customFolderInstructions = "";
  selectedModel: "gpt-4.1-mini" | "llama3.2" = "gpt-4.1-mini";
  customModelName = "llama3.2";
  tagScoreThreshold = 70;
  formatBehavior: "override" | "newFile" = "override";
  useInbox = false;
  imageInstructions =
    "Analyze the image and provide a clear, detailed description focusing on the main elements, context, and any text visible in the image. Include relevant details that would be useful for searching and organizing the image later.";
  debugMode = false;
  enableTitleSuggestions = false;
  // use for sampling of the recommend fucntions
  contentCutoffChars = 1000;
  // use to prevent formatting of big file
  maxFormattingTokens = 100 * 1000;
  screenpipeTimeRange = 8; // Default to 8 hours
  // used only in screenpipe right now
  queryScreenpipeLimit = 250;
  maxChatTokens = 100 * 1000;
  customTagInstructions =
    "Generate tags that capture the main topics, themes, and type of content in the document. Focus on specific, meaningful tags that will help with organization and retrieval.";
  hasCatalystAccess = null;
  hasRunOnboarding = false;
  pdfPageLimit = 10; // default to 10 pages
}

export const DEFAULT_SETTINGS = new FileOrganizerSettings();
