import React, { useState } from 'react';
import { usePlugin } from '../../provider';
import { ModelType } from '../types';

interface SearchToggleProps {
  selectedModel: ModelType;
}

export function SearchToggle({ selectedModel }: SearchToggleProps) {
  const plugin = usePlugin();
  const [isEnabled, setIsEnabled] = useState(plugin.settings.enableSearchGrounding);
  const [isDeepSearch, setIsDeepSearch] = useState(plugin.settings.enableDeepSearch);

  const handleToggle = async () => {
    plugin.settings.enableSearchGrounding = !plugin.settings.enableSearchGrounding;
    await plugin.saveSettings();
    setIsEnabled(!isEnabled);
  };

  const handleDeepSearchToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    plugin.settings.enableDeepSearch = !plugin.settings.enableDeepSearch;
    await plugin.saveSettings();
    setIsDeepSearch(!isDeepSearch);
  };

  // Only show search controls for models that support search
  const supportsSearch = selectedModel === 'gpt-4.1' || 
                         selectedModel === 'gpt-4.1-mini' || 
                         selectedModel === 'gpt-4o' || 
                         selectedModel === 'gpt-4o-search-preview' || 
                         selectedModel === 'gpt-4o-mini-search-preview';
  
  if (!supportsSearch) {
    return null;
  }

  // For search-specific models, search is always enabled
  const isSearchModel = selectedModel === 'gpt-4o-search-preview' || 
                        selectedModel === 'gpt-4o-mini-search-preview';
  
  const searchAutoEnabled = isSearchModel;

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleToggle}
        disabled={isSearchModel}
        className={`flex items-center space-x-1 text-sm px-2 py-1 rounded transition-colors ${
          isEnabled || searchAutoEnabled
            ? "bg-blue-600 text-white hover:bg-blue-700" 
            : "bg-[--background-primary-alt] text-[--text-muted] hover:text-[--text-normal] hover:bg-[--background-modifier-hover]"
        }`}
        title={isEnabled ? "Disable internet search" : "Enable internet search"}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        {(isEnabled || searchAutoEnabled) && <span>Search</span>}
      </button>
      
      {(isEnabled || searchAutoEnabled) && (
        <button
          onClick={handleDeepSearchToggle}
          className={`flex items-center space-x-1 text-sm px-2 py-1 rounded transition-colors ${
            isDeepSearch 
              ? "bg-indigo-600 text-white hover:bg-indigo-700" 
              : "bg-[--background-primary-alt] text-[--text-muted] hover:text-[--text-normal] hover:bg-[--background-modifier-hover]"
          }`}
          title={isDeepSearch ? "Use standard search context" : "Use deep search with more context"}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          {isDeepSearch && <span>Deep</span>}
        </button>
      )}
    </div>
  );
}
