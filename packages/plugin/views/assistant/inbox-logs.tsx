import * as React from "react";
import {
  FileRecord,
  LogEntry,
  Action,
  FileStatus,
} from "../../inbox/services/record-manager";
import moment from "moment";
import {
  ChevronDown,
  Clock,
  Play,
  Check,
  AlertCircle,
  Ban,
  Search,
  Filter,
  Calendar,
} from "lucide-react";

import { usePlugin } from "./provider";
import { Inbox } from "../../inbox";
import { VALID_MEDIA_EXTENSIONS, VALID_AUDIO_EXTENSIONS, VALID_IMAGE_EXTENSIONS } from "../../constants";
import { TFile, Notice } from "obsidian";
import { ProcessingTimeline } from "./organizer/components/processing-timeline";
import { UndoButton } from "./organizer/components/undo-button";


// Enhanced log entry display component
const LogEntryDisplay: React.FC<{ entry: LogEntry; step: Action }> = ({
  entry,
  step,
}) => {
  const getDisplayText = (step: Action) => {
    switch (step) {
      case Action.CLEANUP:
        return "Cleaning up file";
      case Action.RENAME:
        return "Renaming file";
      case Action.EXTRACT:
        return "Extracting text";
      case Action.MOVING_ATTACHMENT:
        return "Moving attachments";
      case Action.CLASSIFY:
        return "Classifying";
      case Action.TAGGING:
        return "Recommending tags";
      case Action.APPLYING_TAGS:
        return "Applying tags";
      case Action.RECOMMEND_NAME:
        return "Recommending name";
      case Action.APPLYING_NAME:
        return "Applying name";
      case Action.FORMATTING:
        return "Formatting";
      case Action.MOVING:
        return "Moving file";
      case Action.COMPLETED:
        return "Completed";
      default:
        return step;
    }
  };

  const isErrorStep = step.toString().startsWith("ERROR_");
  const hasError = entry.error || isErrorStep;

  return (
    <div className="flex items-center gap-2 py-1.5">
      {/* Status indicator */}
      <div
        className={`w-2 h-2 rounded-full ${
          hasError
            ? "bg-[--text-error]"
            : entry.skipped
            ? "bg-[--text-muted]"
            : entry.completed
            ? "bg-[--text-success]"
            : "bg-[--text-accent] animate-pulse"
        }`}
      />

      {/* Timestamp */}
      <span className="text-[--text-muted] w-20 text-xs">
        {moment(entry.timestamp).format("HH:mm:ss")}
      </span>

      {/* Step name */}
      <span
        className={`text-sm ${
          hasError 
            ? "text-[--text-error]" 
            : entry.skipped
            ? "text-[--text-muted] line-through"
            : "text-[--text-muted]"
        }`}
      >
        {getDisplayText(step)}
        {entry.skipped && " (skipped)"}
      </span>

      {/* Error display */}
      {entry.error && (
        <div 
          className="flex items-center gap-1 text-[--text-error] text-sm ml-auto"
          title={`Error: ${entry.error.message}${entry.error.stack ? '\n\n' + entry.error.stack : ''}`}
        >
          <AlertCircle className="w-4 h-4" />
          <span className="truncate max-w-[200px]">
            {entry.error.message}
          </span>
        </div>
      )}
    </div>
  );
};

// Add this helper component for the filename display
const FileNameDisplay: React.FC<{ record: FileRecord }> = ({ record }) => {
  const hasNewName = record.newName && record.originalName !== record.newName;

  if (!hasNewName) {
    return (
      <span className="text-[--text-accent]">
        {record.originalName || "No file"}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[--text-muted] line-through">
        {record.originalName}
      </span>
      <span className="text-[--text-muted]">→</span>
      <span className="text-[--text-accent]">{record.newName}</span>
    </div>
  );
};

// Add this helper component for the path display
const PathDisplay: React.FC<{ record: FileRecord }> = ({ record }) => {
  if (!record.newPath) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[--text-muted]">→</span>
      <span className="text-[--text-accent]">{record.newPath}</span>
    </div>
  );
};

// Add this component for essential information display
const EssentialInfoDisplay: React.FC<{ record: FileRecord }> = ({ record }) => {
  const plugin = usePlugin();
  const hasRename = record.newName && record.originalName !== record.newName;
  const hasMove = record.newPath;
  
  // Helper function to find action logs and get timestamps
  const getActionTimestamp = (actionContains: string): string | null => {
    const found = Object.entries(record.logs).find(
      ([actionKey]) => actionKey.includes(actionContains)
    );
    return found ? (found[1] as LogEntry).timestamp : null;
  };
  
  // Format timestamp using moment
  const formatTimestamp = (ts: string | null): string => {
    return ts ? moment(ts).format("HH:mm:ss") : "";
  };
  
  // Get file extension
  const fileExtension = record.originalName.split('.').pop()?.toLowerCase() || '';
  
  // Check for specific actions in the logs
  const hasTranscribedAudio = Object.keys(record.logs).some(action => 
    action.includes("EXTRACT_DONE") && 
    VALID_AUDIO_EXTENSIONS.some(ext => fileExtension === ext)
  );
  
  const audioTimestamp = hasTranscribedAudio ? 
    getActionTimestamp("EXTRACT_DONE") : null;
  
  const hasProcessedImage = Object.keys(record.logs).some(action => 
    action.includes("EXTRACT_DONE") && 
    VALID_IMAGE_EXTENSIONS.some(ext => fileExtension === ext)
  );
  
  const imageTimestamp = hasProcessedImage ? 
    getActionTimestamp("EXTRACT_DONE") : null;
  
  const hasYouTubeTranscript = Object.keys(record.logs).some(action => 
    action.includes("FETCH_YOUTUBE")
  );
  
  const youtubeTimestamp = hasYouTubeTranscript ? 
    getActionTimestamp("FETCH_YOUTUBE_DONE") : null;
    
  const hasFormatted = record.formatted || Object.keys(record.logs).some(action => 
    action.includes("FORMATTING_DONE")
  );
  
  const formattingTimestamp = hasFormatted ? 
    getActionTimestamp("FORMATTING_DONE") : null;
  
  if (!hasRename && !hasMove && !hasTranscribedAudio && !hasProcessedImage && 
      record.tags.length === 0 && !hasYouTubeTranscript && !hasFormatted) {
    return null;
  }
  
  return (
    <div className="space-y-2">
      {hasRename && (
        <div className="text-sm">
          Renamed as{" "}
          <span 
            className="text-[--text-accent] cursor-pointer hover:underline"
            onClick={() => 
              plugin.app.workspace.openLinkText(
                record.newName || '',
                record.file?.parent?.path || ''
              )
            }
          >
            {record.newName}
          </span>
          {" "}
          <span className="text-[--text-muted] text-xs">
            {formatTimestamp(getActionTimestamp("RENAME_DONE"))}
          </span>
        </div>
      )}
      
      {hasMove && (
        <div className="text-sm">
          Moved to{" "}
          <span 
            className="text-[--text-accent] cursor-pointer hover:underline"
            onClick={() => 
              plugin.app.workspace.openLinkText(
                record.file?.basename || '',
                record.newPath || ''
              )
            }
          >
            {record.newPath}
          </span>
          {" "}
          <span className="text-[--text-muted] text-xs">
            {formatTimestamp(getActionTimestamp("MOVING_DONE"))}
          </span>
        </div>
      )}
      
      {hasTranscribedAudio && (
        <div className="text-sm">
          Transcribed audio{" "}
          <span className="text-[--text-muted] text-xs">
            {formatTimestamp(audioTimestamp)}
          </span>
        </div>
      )}
      
      {hasProcessedImage && (
        <div className="text-sm">
          Processed image{" "}
          <span className="text-[--text-muted] text-xs">
            {formatTimestamp(imageTimestamp)}
          </span>
        </div>
      )}
      
      {hasFormatted && (
        <div className="text-sm">
          Note formatted as{" "}
          <span 
            className="text-[--text-accent] cursor-pointer hover:underline"
            onClick={() => {
              // Open the template file when clicked
              if (record.classification) {
                const templatePath = `${plugin.settings.templatePaths}/${record.classification}.md`;
                const templateFile = plugin.app.vault.getAbstractFileByPath(templatePath);
                if (templateFile) {
                  plugin.app.workspace.getLeaf().openFile(templateFile as TFile);
                } else {
                  // If template file not found, show notification
                  new Notice(`Template file not found: ${templatePath}`);
                }
              }
            }}
          >
            {record.classification || "document"}
          </span>
          {" "}
          <span className="text-[--text-muted] text-xs">
            {formatTimestamp(formattingTimestamp)}
          </span>
        </div>
      )}
      
      {record.tags.length > 0 && (
        <div className="text-sm">
          Added tags:{" "}
          {record.tags.join(', ')}
        </div>
      )}
      
      {hasYouTubeTranscript && (
        <div className="text-sm">
          Extracted YouTube transcript{" "}
          <span className="text-[--text-muted] text-xs">
            {formatTimestamp(youtubeTimestamp)}
          </span>
        </div>
      )}
    </div>
  );
};

// Main file card component - compressed, dense list item
function FileCard({ record }: { record: FileRecord }) {
  const plugin = usePlugin();
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div
      className="border-b border-[--background-modifier-border] hover:bg-[--background-modifier-hover]"
    >
      <div 
        className="px-3 py-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Compact header - single line */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="cursor-pointer flex items-center gap-2 flex-1 min-w-0"
              onClick={(e) => {
                e.stopPropagation();
                plugin.app.workspace.openLinkText(
                  record.file?.basename || '',
                  record.file?.parent?.path || ''
                );
              }}
            >
              <StatusBadge status={record.status} />
              <FileNameDisplay record={record} />
            </div>
          </div>
          <UndoButton record={record} plugin={plugin} />
        </div>

        {/* Essential info - only when expanded */}
        {isExpanded && (
          <div className="mt-2 space-y-2">
            <EssentialInfoDisplay record={record} />
            
            {/* Processing Timeline */}
            {(record.status === "processing" || record.status === "completed" || record.status === "error") && (
              <div className="mt-3">
                <ProcessingTimeline record={record} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Status badge component
const StatusBadge: React.FC<{ status: FileStatus }> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "bg-[--text-success]";
      case "error":
        return "bg-[--text-error]";
      case "processing":
        return "bg-[--text-accent]";
      default:
        return "bg-[--text-muted]";
    }
  };

  return (
    <span className="inline-flex items-center">
      <span className="sr-only">{status}</span>
      <span
        className={`w-2 h-2 rounded-full ${getStatusColor()}`}
        aria-hidden="true"
      />
    </span>
  );
};

// Analytics component
const InboxAnalytics: React.FC<{
  analytics: ReturnType<typeof Inbox.prototype.getAnalytics>;
}> = ({ analytics }) => {
  const { byStatus } = analytics;

  // Split statuses into main flow and exceptions
  const mainFlow: Array<{
    status: FileStatus;
    icon: React.ReactNode;
  }> = [
    { status: "queued", icon: <Clock className="w-4 h-4" /> },
    { status: "processing", icon: <Play className="w-4 h-4" /> },
    { status: "completed", icon: <Check className="w-4 h-4" /> },
  ];

  const exceptions: Array<{
    status: FileStatus;
    icon: React.ReactNode;
  }> = [
    { status: "error", icon: <AlertCircle className="w-4 h-4" /> },
    { status: "bypassed", icon: <Ban className="w-4 h-4" /> },
  ];

  const StatusBox = ({
    status,
    icon,
  }: {
    status: FileStatus;
    icon: React.ReactNode;
  }) => (
    <div
      key={status}
      className="bg-[--background-primary] p-4 rounded text-center flex flex-col items-center"
    >
      <div className="text-sm capitalize">{status}</div>
      <div className="font-semibold">{byStatus[status] || 0}</div>
      <div className="mt-1 text-[--text-muted]">{icon}</div>
    </div>
  );

  return (
    <div className="bg-[--background-secondary] ">
      <div className="space-y-2">
        {/* Main flow row */}
        <div className="grid grid-cols-3 gap-2">
          {mainFlow.map(({ status, icon }) => (
            <StatusBox key={status} status={status} icon={icon} />
          ))}
        </div>

        {/* Exceptions row */}
        <div className="grid grid-cols-2 gap-2">
          {exceptions.map(({ status, icon }) => (
            <StatusBox key={status} status={status} icon={icon} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Update types
type DateRange = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'all' | 'custom';

interface DateFilter {
  range: DateRange;
  startDate: string;
  endDate: string;
}

// Enhanced date filter component
const DateFilterSelect: React.FC<{
  value: DateFilter;
  onChange: (filter: DateFilter) => void;
}> = ({ value, onChange }) => {
  const ranges: Array<{ value: DateRange; label: string }> = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 days' },
    { value: 'last30days', label: 'Last 30 days' },
    { value: 'custom', label: 'Pick date' },
    { value: 'all', label: 'All time' },
  ];

  const getDateRange = (range: DateRange, customDate?: string): { startDate: string; endDate: string } => {
    let end = moment().endOf('day');
    let start = moment().startOf('day');

    switch (range) {
      case 'today':
        break;
      case 'yesterday':
        start = start.subtract(1, 'day');
        end.subtract(1, 'day');
        break;
      case 'last7days':
        start = start.subtract(6, 'days');
        break;
      case 'last30days':
        start = start.subtract(29, 'days');
        break;
      case 'custom':
        if (customDate) {
          start = moment(customDate).startOf('day');
          end = moment(customDate).endOf('day');
        }
        break;
      case 'all':
        start = moment(0);
        break;
    }

    return {
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
    };
  };

  const handleRangeChange = (range: DateRange) => {
    const dates = getDateRange(range);
    onChange({
      range,
      ...dates,
    });
  };

  const handleDateChange = (date: string) => {
    const dates = getDateRange('custom', date);
    onChange({
      range: 'custom',
      ...dates,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[--text-muted]" />
        <select
          value={value.range}
          onChange={(e) => handleRangeChange(e.target.value as DateRange)}
          className="pl-2 pr-8 h-min py-2 bg-[--background-secondary] rounded-l border border-[--background-modifier-border] text-sm appearance-none"
        >
          {ranges.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Calendar picker - only shown when 'custom' is selected */}
      {value.range === 'custom' && (
        <input
          type="date"
          value={value.startDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="py-2 pl-6 pr-2 bg-[--background-secondary] rounded-r border border-[--background-modifier-border] text-sm w-min"
          max={moment().format('YYYY-MM-DD')}
        />
      )}
    </div>
  );
};

// Update SearchBar props
interface SearchBarProps {
  onSearch: (query: string) => void;
  onStatusFilter: (status: FileStatus | "") => void;
  onDateFilter: (filter: DateFilter) => void;
  selectedStatus: FileStatus | "";
  dateFilter: DateFilter;
}

// Update SearchBar component
const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onStatusFilter,
  onDateFilter,
  selectedStatus,
  dateFilter,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const statuses: Array<FileStatus | ""> = [
    "",
    "queued",
    "processing",
    "completed",
    "error",
    "bypassed",
  ];

  return (
    <div className="bg-[--background-primary] p-4 border border-[--background-modifier-border] space-y-3">
      {/* Search input row */}
      <div className="pl-10 relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[--text-muted]" />
        <input
          type="text"
          placeholder="Search files, tags, or actions..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 h-min py-2 bg-[--background-secondary] rounded border border-[--background-modifier-border] text-sm"
        />
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3">
        <div className="relative w-[200px]">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[--text-muted]" />
          <select
            value={selectedStatus}
            onChange={e => onStatusFilter(e.target.value as FileStatus | "")}
            className="w-full pl-9 pr-4 h-min py-2 bg-[--background-secondary] rounded border border-[--background-modifier-border] text-sm appearance-none"
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status
                  ? status.charAt(0).toUpperCase() + status.slice(1)
                  : "All Status"}
              </option>
            ))}
          </select>
        </div>
        <DateFilterSelect 
          value={dateFilter}
          onChange={onDateFilter}
        />
      </div>
    </div>
  );
};

// Main component
export const InboxLogs: React.FC = () => {
  const plugin = usePlugin();
  const [records, setRecords] = React.useState<FileRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = React.useState<FileRecord[]>([]);
  const [analytics, setAnalytics] = React.useState<ReturnType<typeof Inbox.prototype.getAnalytics>>();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<FileStatus | "">("");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>({
    range: 'today',
    startDate: moment().format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
  });

  // Memoize filterRecords to prevent recreation on every render
  const filterRecords = React.useCallback(
    (records: FileRecord[]) => {
      return records.filter(record => {
        const matchesSearch = searchQuery
          .toLowerCase()
          .split(" ")
          .every(
            term =>
              record.file?.basename.toLowerCase().includes(term) ||
              record?.tags.some(tag => tag.toLowerCase().includes(term)) ||
              Object.keys(record.logs).some(action =>
                action.toLowerCase().includes(term)
              ) ||
              record.classification?.toLowerCase().includes(term)
          );

        const matchesStatus = !statusFilter || record.status === statusFilter;

        const matchesDate = dateFilter.range === 'all' || Object.values(record.logs).some(log => {
          const logDate = moment(log.timestamp);
          return logDate.isBetween(
            moment(dateFilter.startDate).startOf('day'),
            moment(dateFilter.endDate).endOf('day'),
            'day',
            '[]'
          );
        });

        return matchesSearch && matchesStatus && matchesDate;
      });
    },
    [searchQuery, statusFilter, dateFilter.range, dateFilter.startDate, dateFilter.endDate]
  );

  // Add a function to check if records have changed
  const haveRecordsChanged = (oldRecords: FileRecord[], newRecords: FileRecord[]) => {
    if (oldRecords.length !== newRecords.length) return true;
    
    return newRecords.some((newRecord, index) => {
      const oldRecord = oldRecords[index];
      return (
        newRecord.status !== oldRecord.status ||
        newRecord.tags.length !== oldRecord.tags.length ||
        Object.keys(newRecord.logs).length !== Object.keys(oldRecord.logs).length ||
        newRecord.newName !== oldRecord.newName ||
        newRecord.newPath !== oldRecord.newPath
      );
    });
  };

  // Update filtered records when filters change
  React.useEffect(() => {
    setFilteredRecords(filterRecords(records));
  }, [filterRecords, records]);

  // Fetch data periodically
  React.useEffect(() => {
    const fetchData = () => {
      const newFiles = plugin.inbox.getAllFiles();
      const newAnalytics = plugin.inbox.getAnalytics();
      
      // Only update if something has changed
      if (haveRecordsChanged(records, newFiles)) {
        setRecords(newFiles);
      }
      
      // Update analytics only if they've changed
      if (JSON.stringify(analytics) !== JSON.stringify(newAnalytics)) {
        setAnalytics(newAnalytics);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 1000);
    return () => clearInterval(intervalId);
  }, [plugin.inbox, records, analytics]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleStatusFilter = (status: FileStatus | "") => {
    setStatusFilter(status);
  };

  const handleDateFilter = (filter: DateFilter) => {
    setDateFilter(filter);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Analytics - compact, no padding */}
      {analytics && (
        <div className="border-b border-[--background-modifier-border]">
          <InboxAnalytics analytics={analytics} />
        </div>
      )}

      {/* Search bar - flush */}
      <div className="border-b border-[--background-modifier-border] px-3 py-2">
        <SearchBar
          onSearch={handleSearch}
          onStatusFilter={handleStatusFilter}
          onDateFilter={handleDateFilter}
          selectedStatus={statusFilter}
          dateFilter={dateFilter}
        />
      </div>

      {/* Date indicator - minimal */}
      {dateFilter.range !== 'all' && (
        <div className="text-xs text-[--text-muted] px-3 py-1 border-b border-[--background-modifier-border]">
          {dateFilter.range === 'custom' ? (
            <>{moment(dateFilter.startDate).format('MMM D, YYYY')}</>
          ) : (
            <>
              {moment(dateFilter.startDate).format('MMM D')}
              {dateFilter.startDate !== dateFilter.endDate && 
                ` - ${moment(dateFilter.endDate).format('MMM D')}`}
            </>
          )}
        </div>
      )}

      {/* File list - dense, flush edges */}
      <div className="flex-1 overflow-y-auto">
        {filteredRecords.map(record => (
          <FileCard key={record.id} record={record} />
        ))}
        {filteredRecords.length === 0 && (
          <div className="flex items-center justify-center h-32 text-xs text-[--text-muted]">
            {records.length === 0 ? "No records found" : "No matching records"}
          </div>
        )}
      </div>
    </div>
  );
};
