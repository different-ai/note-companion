import { createOpenAI } from "@ai-sdk/openai";

const DEFAULT_MODEL = "gpt-4o-mini";

const getBaseUrl = (): string => {
  const baseUrl = process.env.OPENAI_API_BASE;
  if (!baseUrl) {
    console.warn("No base URL found for OpenAI, using default URL");
    return "https://api.openai.com/v1";
  }
  return baseUrl;
};

const baseURL = getBaseUrl();

const openaiClient = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL,
});

const models = {
  // Regular chat completion models
  "gpt-4o-mini": openaiClient("gpt-4o-mini"),
  "gpt-4o": openaiClient("gpt-4o"),
  // Responses API models (support web search tool and structured outputs)
  "gpt-4o-mini-responses": openaiClient.responses("gpt-4o-mini"),
  "gpt-4o-responses": openaiClient.responses("gpt-4o"),
};

export const getModel = (name: string) => {
  // Migration: Handle old invalid model names
  const modelMigrations: Record<string, string> = {
    "gpt-4.1-mini": "gpt-4o-mini",
    "gpt-4.1": "gpt-4o",
    "gpt-4.1-mini-responses": "gpt-4o-mini-responses",
  };

  // Check if model needs migration
  const migratedName = modelMigrations[name] || name;
  
  if (migratedName !== name) {
    console.log(`Model migration: ${name} → ${migratedName}`);
  }

  if (!models[migratedName]) {
    console.log(`Model ${migratedName} not found`);
    console.log(`Defaulting to ${DEFAULT_MODEL}`);
    return models[DEFAULT_MODEL];
  }
  console.log(`Using model: ${migratedName}`);

  return models[migratedName];
};

export const getAvailableModels = () => {
  return Object.keys(models);
};