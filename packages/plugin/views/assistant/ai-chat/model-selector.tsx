import React from 'react';
import { ModelType } from './types';
import { usePlugin } from '../provider';

// Add a mapping for display names
const MODEL_DISPLAY_NAMES: Record<ModelType, string> = {
  'gpt-4o-mini': 'Cloud',
  'custom': 'Ollama Model'
} as const;

// Helper to get display name
const getDisplayName = (model: ModelType): string => {
  return MODEL_DISPLAY_NAMES[model] || model;
};

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelSelect: (model: ModelType) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelSelect,
}) => {
  const plugin = usePlugin();
  const [isModelSelectorOpen, setIsModelSelectorOpen] = React.useState(false);
  const [isCustomizing, setIsCustomizing] = React.useState(false);
  const [customModel, setCustomModel] = React.useState(plugin.settings.customModelName || "llama3.2");

  const handleModelSelect = async (model: ModelType) => {
    if (model === "custom") {
      setIsCustomizing(true);
      return;
    }
    onModelSelect(model);
    if (model === "gpt-4o-mini" || model === "llama3.2") {
      plugin.settings.selectedModel = model;
    }
    await plugin.saveSettings();
    setIsModelSelectorOpen(false);
  };

  const handleCustomModelSave = async () => {
    plugin.settings.customModelName = customModel;
    plugin.settings.selectedModel = customModel as "gpt-4o-mini" | "llama3.2";
    await plugin.saveSettings();
    onModelSelect(customModel);
    setIsCustomizing(false);
    setIsModelSelectorOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-end">
        <div
          onClick={() => plugin.settings.showLocalLLMInChat && setIsModelSelectorOpen(!isModelSelectorOpen)}
          className={`flex items-center gap-1 text-xs text-[--text-muted] ${plugin.settings.showLocalLLMInChat ? 'hover:text-[--text-normal] cursor-pointer' : ''}`}
        >
          <span>{getDisplayName(selectedModel)}</span>
          {plugin.settings.showLocalLLMInChat && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-3 h-3 transition-transform ${
                isModelSelectorOpen ? "rotate-180" : ""
              }`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        {isModelSelectorOpen && plugin.settings.showLocalLLMInChat && (
          <div className="absolute bottom-full right-0 mb-1 bg-[--background-primary] border border-[--background-modifier-border]">
            <div className="py-1">
              <div
                onClick={() => handleModelSelect("gpt-4o-mini")}
                className="cursor-pointer block w-full text-left px-4 py-2 text-sm text-[--text-normal] hover:bg-[--background-modifier-hover]"
              >
                {getDisplayName("gpt-4o-mini")}
              </div>

              {isCustomizing ? (
                <div className="px-4 py-2">
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    className="w-full px-2 py-1 text-sm border bg-[--background-primary] text-[--text-normal] border-[--background-modifier-border]"
                    placeholder="Enter model name..."
                  />
                  <div className="flex justify-end mt-2 space-x-2">
                    <button
                      onClick={() => setIsCustomizing(false)}
                      className="px-2 py-1 text-xs text-[--text-muted] hover:text-[--text-normal]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCustomModelSave}
                      className="px-2 py-1 text-xs text-[--text-accent] hover:text-[--text-accent-hover]"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => handleModelSelect("custom")}
                  className="cursor-pointer block w-full text-left px-4 py-2 text-sm text-[--text-normal] hover:bg-[--background-modifier-hover]"
                >
                  {getDisplayName("custom")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
