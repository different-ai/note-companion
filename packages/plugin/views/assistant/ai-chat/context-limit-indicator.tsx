import React from "react";
import { init, get_encoding } from "tiktoken/init";
import wasmBinary from "tiktoken/tiktoken_bg.wasm";
import { useDebouncedCallback } from 'use-debounce';
import { logger } from "../../../services/logger";
import { useContextItems } from "./use-context-items";

interface TokenStats {
  contextSize: number;
  percentUsed: number;
}

export function ContextLimitIndicator({ 
  unifiedContext, 
  maxContextSize 
}: { 
  unifiedContext: string;
  maxContextSize: number;
}) {
  const [stats, setStats] = React.useState<TokenStats>({ contextSize: 0, percentUsed: 0 });
  const [error, setError] = React.useState<string>();
  const [tiktokenInitialized, setTiktokenInitialized] = React.useState(false);
  const { isLightweightMode, toggleLightweightMode } = useContextItems();

  // Initialize encoder once on mount
  React.useEffect(() => {
    async function setup() {
      try {
        if (!tiktokenInitialized) {
          await init((imports) => WebAssembly.instantiate(wasmBinary, imports));
          setTiktokenInitialized(true);
        }
      } catch (e) {
        setError('Failed to initialize token counter');
      }
    }

    setup();
  }, []);

  // Debounced token calculation
  const calculateTokens = useDebouncedCallback((text: string) => {
    if (!text || !tiktokenInitialized) return;
    const encoder = get_encoding("cl100k_base");
    
    try {
      const tokens = encoder.encode(text);
      logger.debug("tokens", { tokens });
      setStats({
        contextSize: tokens.length,
        percentUsed: (tokens.length / maxContextSize) * 100
      });
    } catch {
      setError('Token counting failed');
    } finally {
      encoder.free();
    }
  }, 300);

  // Update tokens when context changes
  React.useEffect(() => {
    calculateTokens(unifiedContext);
  }, [unifiedContext]);

  if (error) {
    return <div className="mt-2 p-2 rounded text-xs text-[--text-error] border border-[--text-error]">{error}</div>;
  }

  const isOverLimit = stats.contextSize > maxContextSize;
  const shouldWarn = stats.percentUsed > 80;
  
  return (
    <div className="mt-2 space-y-2 flex">
      <div className="relative group">
        <div className={`p-2 min-w-max rounded text-xs flex gap-1 items-center justify-between cursor-pointer hover:bg-[--background-modifier-hover] transition-colors
          ${isOverLimit 
            ? "border border-[--text-error] text-[--text-error]" 
            : shouldWarn
              ? "border border-[--text-warning] text-[--text-warning]"
              : "border border-[--background-modifier-border] text-[--text-muted]"}`}>
          <span>
            {isOverLimit 
              ? "Context size exceeds maximum" 
              : shouldWarn
                ? "Context size nearing limit"
                : "Context used"}
          </span>
          <span className="font-mono">{stats.percentUsed.toFixed(0)}%</span>
        </div>

        {/* Enhanced menu-style tooltip */}
        <div className="absolute left-0 top-full mt-1 w-72 bg-[--background-secondary] border border-[--background-modifier-border] opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div
            onClick={toggleLightweightMode}
            className={`w-full px-4 py-3.5 text-left text-xs flex items-start justify-between gap-4 hover:bg-[--background-modifier-hover] rounded-md cursor-pointer
              ${isLightweightMode 
                ? "text-[--interactive-accent]" 
                : "text-[--text-normal]"}`}
          >
            <div className="space-y-1.5 flex-1">
              <div className="font-medium flex items-center gap-2">
                <div className={`w-4 h-4 rounded border flex items-center justify-center
                  ${isLightweightMode 
                    ? "border-[--interactive-accent] bg-[--interactive-accent]" 
                    : "border-[--background-modifier-border]"}`}
                >
                  {isLightweightMode && (
                    <svg className="w-3 h-3 text-[--text-on-accent]" viewBox="0 0 14 14" fill="none">
                      <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span>Disable Context</span>
              </div>
              <div className="text-[--text-muted] text-[11px] leading-relaxed">
                Removes file content from context while preserving metadata. Useful for batch operations like moving, renaming, or tagging files.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}