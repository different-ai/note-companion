import { openai } from "@ai-sdk/openai";

// Always use gpt-4.1-mini - ignore any model parameter from client
const DEFAULT_MODEL = openai("gpt-4.1-mini");
const DEFAULT_RESPONSES_MODEL = openai.responses("gpt-4.1-mini");

/**
 * Get the default model for chat completion
 * Note: We ignore any model parameter from the client to ensure consistency
 */
export const getModel = (_name?: string) => {
  console.log("Using default model: gpt-4.1-mini");
  return DEFAULT_MODEL;
};

/**
 * Get the default model with Responses API (supports web search)
 */
export const getResponsesModel = () => {
  console.log("Using default responses model: gpt-4.1-mini");
  return DEFAULT_RESPONSES_MODEL;
};