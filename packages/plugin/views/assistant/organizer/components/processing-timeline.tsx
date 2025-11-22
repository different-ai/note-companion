import * as React from "react";
import { tw } from "@/lib/utils";
import { StyledContainer } from "@/components/ui/utils";
import { Check, Clock, AlertCircle, Loader } from "lucide-react";
import { Action, FileRecord } from "../../../../inbox/services/record-manager";

interface ProcessingTimelineProps {
  record: FileRecord;
}

interface TimelineStep {
  action: Action;
  label: string;
  timestamp?: string;
  duration?: number;
  status: "pending" | "processing" | "completed" | "error" | "skipped";
}

export const ProcessingTimeline: React.FC<ProcessingTimelineProps> = ({ record }) => {
  const getSteps = (): TimelineStep[] => {
    const actionOrder: Action[] = [
      Action.VALIDATE,
      Action.CONTAINER,
      Action.MOVING_ATTACHMENT,
      Action.EXTRACT,
      Action.CLEANUP,
      Action.FETCH_YOUTUBE,
      Action.CLASSIFY,
      Action.MOVING,
      Action.RENAME,
      Action.FORMATTING,
      Action.APPEND,
      Action.TAGGING,
      Action.COMPLETED,
    ];

    return actionOrder.map(action => {
      const log = record.logs[action];
      const getLabel = (action: Action): string => {
        const labels: Record<Action, string> = {
          [Action.VALIDATE]: "Validate",
          [Action.CONTAINER]: "Container",
          [Action.MOVING_ATTACHMENT]: "Attachments",
          [Action.EXTRACT]: "Extract",
          [Action.CLEANUP]: "Cleanup",
          [Action.FETCH_YOUTUBE]: "YouTube",
          [Action.CLASSIFY]: "Classify",
          [Action.MOVING]: "Move",
          [Action.RENAME]: "Rename",
          [Action.FORMATTING]: "Format",
          [Action.APPEND]: "Append",
          [Action.TAGGING]: "Tags",
          [Action.COMPLETED]: "Complete",
        } as any;
        return labels[action] || action.toString();
      };

      let status: TimelineStep["status"] = "pending";
      if (log) {
        if (log.error) status = "error";
        else if (log.skipped) status = "skipped";
        else if (log.completed) status = "completed";
        else status = "processing";
      }

      return {
        action,
        label: getLabel(action),
        timestamp: log?.timestamp,
        status,
      };
    }).filter(step => step.status !== "pending"); // Only show steps that have started
  };

  const steps = getSteps();
  
  // Calculate durations between steps
  const stepsWithDuration = steps.map((step, index) => {
    if (index === 0) return { ...step, duration: 0 };
    
    const prevStep = steps[index - 1];
    if (step.timestamp && prevStep.timestamp) {
      const duration = new Date(step.timestamp).getTime() - new Date(prevStep.timestamp).getTime();
      return { ...step, duration };
    }
    return step;
  });

  const getStepIcon = (status: TimelineStep["status"]) => {
    switch (status) {
      case "completed":
        return <Check className={tw("w-4 h-4 text-[--text-success]")} />;
      case "processing":
        return <Loader className={tw("w-4 h-4 text-[--interactive-accent] animate-spin")} />;
      case "error":
        return <AlertCircle className={tw("w-4 h-4 text-[--text-error]")} />;
      case "skipped":
        return <div className={tw("w-4 h-4 rounded-full bg-[--background-modifier-border]")} />;
      default:
        return <Clock className={tw("w-4 h-4 text-[--text-muted]")} />;
    }
  };

  const getStepColor = (status: TimelineStep["status"]) => {
    switch (status) {
      case "completed":
        return "bg-[--text-success]";
      case "processing":
        return "bg-[--interactive-accent]";
      case "error":
        return "bg-[--text-error]";
      default:
        return "bg-[--background-modifier-border]";
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (steps.length === 0) {
    return null;
  }

  return (
    <StyledContainer className={tw("bg-[--background-secondary] border-b border-[--background-modifier-border] p-4")}>
      <div className={tw("flex items-center justify-between mb-4")}>
        <h4 className={tw("text-sm font-medium text-[--text-normal]")}>Processing Timeline</h4>
        <div className={tw("text-xs text-[--text-muted]")}>
          {record.status === "completed" && "✓ Completed"}
          {record.status === "processing" && "⏳ In Progress"}
          {record.status === "error" && "⚠ Error"}
        </div>
      </div>

      <div className={tw("space-y-3")}>
        {stepsWithDuration.map((step, index) => (
          <div key={step.action} className={tw("flex items-start gap-3")}>
            {/* Timeline connector */}
            <div className={tw("flex flex-col items-center")}>
              <div className={`w-8 h-8 rounded-full bg-[--background-primary] border-2 flex items-center justify-center ${
                step.status === "completed" ? "border-[--text-success]" : 
                step.status === "error" ? "border-[--text-error]" : 
                step.status === "processing" ? "border-[--interactive-accent]" : 
                "border-[--background-modifier-border]"
              }`}>
                {getStepIcon(step.status)}
              </div>
              {index < stepsWithDuration.length - 1 && (
                <div className={`w-0.5 h-6 mt-1 ${getStepColor(step.status)}`} />
              )}
            </div>

            {/* Step details */}
            <div className={tw("flex-1 pb-2")}>
              <div className={tw("flex items-center justify-between")}>
                <span className={tw("text-sm font-medium text-[--text-normal]")}>
                  {step.label}
                </span>
                {step.duration !== undefined && step.duration > 0 && (
                  <span className={tw("text-xs text-[--text-muted] font-mono")}>
                    {formatDuration(step.duration)}
                  </span>
                )}
              </div>
              {step.timestamp && (
                <div className={tw("text-xs text-[--text-muted] mt-0.5")}>
                  {formatTime(step.timestamp)}
                </div>
              )}
              {step.status === "skipped" && (
                <div className={tw("text-xs text-[--text-muted] italic mt-1")}>
                  Skipped
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      {record.status === "completed" && stepsWithDuration.length > 1 && (
        <div className={tw("mt-4 pt-4 border-t border-[--background-modifier-border]")}>
          <div className={tw("flex items-center justify-between text-xs")}>
            <span className={tw("text-[--text-muted]")}>Total time:</span>
            <span className={tw("text-[--text-normal] font-mono font-medium")}>
              {formatDuration(
                stepsWithDuration.reduce((sum, step) => sum + (step.duration || 0), 0)
              )}
            </span>
          </div>
        </div>
      )}
    </StyledContainer>
  );
};
