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
  if (!models[name]) {
    console.log(`Model ${name} not found`);
    console.log(`Defaulting to ${DEFAULT_MODEL}`);
    return models[DEFAULT_MODEL];
  }
  console.log(`Using model: ${name}`);

  return models[name];
};

export const getAvailableModels = () => {
  return Object.keys(models);
};