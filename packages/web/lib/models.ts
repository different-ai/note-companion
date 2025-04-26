import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createGroq } from "@ai-sdk/groq";
import { createDeepSeek } from "@ai-sdk/deepseek";

const DEFAULT_BASE_URLS = {
  OPENAI: "https://api.openai.com/v1",
  GROQ: "https://api.groq.com/openai/v1",
  ANTHROPIC: "https://api.anthropic.com/v1",
  GOOGLE: "https://generativelanguage.googleapis.com/v1beta",
  DEEPSEEK: "https://api.deepseek.com/v1",
};

const getBaseUrl = (type: string): string => {
  const baseUrl = process.env[`${type}_API_BASE`];
  if (!baseUrl) {
    console.warn(`No base URL found for ${type}, using default ${type} URL`);
    return DEFAULT_BASE_URLS[type];
  }
  return baseUrl;
};

const baseURL = getBaseUrl("OPENAI");
const groqBaseURL = getBaseUrl("GROQ");
const anthropicBaseURL = getBaseUrl("ANTHROPIC");
const googleBaseURL = getBaseUrl("GOOGLE");
const deepseekBaseURL = getBaseUrl("DEEPSEEK");
const DEFAULT_MODEL = "gpt-4.1-mini";

const createBedrockConfig = () => ({
  region: process.env.AWS_REGION || "us-west-2",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
});

const models = {
  "gpt-4.1": createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL,
  })("gpt-4.1"),
  "gpt-4.1-mini": createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL,
  })("gpt-4.1-mini"),
  "gpt-4o": createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL,
  })("gpt-4o"),
  "gpt-4o-2024-08-06": createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL,
  })("gpt-4o-2024-08-06"),
  "gpt-4o-mini": createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL,
  })("gpt-4o-mini"),
  "gpt-4o-search-preview": createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL,
  })("gpt-4o-search-preview"),
  "gpt-4o-mini-search-preview": createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL,
  })("gpt-4o-mini-search-preview"),
  "claude-3-5-sonnet-20240620": createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: anthropicBaseURL,
  })("claude-3-5-sonnet-20240620"),
  "claude-3-5-sonnet-20241022": createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })("claude-3-5-sonnet-20241022"),
  "claude-3-5-haiku-20241022": createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })("claude-3-5-haiku-20241022"),
  "gemini-2.0-flash-exp": createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
    baseURL: googleBaseURL,
  })("gemini-2.0-flash-exp", {
    useSearchGrounding: true,
  }),

  "gemini-1.5-pro-search": createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
    baseURL: googleBaseURL,
  })("gemini-1.5-pro"),
  // bedrock
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        // Llama Models
        "llama-3-3-70b": createAmazonBedrock(createBedrockConfig())("meta.llama3-3-70b-instruct-v1:0"),
        "llama-3-2-90b": createAmazonBedrock(createBedrockConfig())("meta.llama3-2-90b-instruct-v1:0"),
        // Mistral Models
        "mistral-large": createAmazonBedrock(createBedrockConfig())("mistral.mistral-large-2407-v1:0"),
        "mixtral-8x7b": createAmazonBedrock(createBedrockConfig())("mistral.mixtral-8x7b-instruct-v0:1"),
        // Anthropic Models
        "anthropic.claude-3-5-sonnet-20240620-v1:0": createAmazonBedrock(createBedrockConfig())("anthropic.claude-3-5-sonnet-20240620-v1:0"),
        "anthropic.claude-3-5-haiku-20241022-v1:0": createAmazonBedrock(createBedrockConfig())("anthropic.claude-3-5-haiku-20241022-v1:0"),
      }
    : {}),
  ...(process.env.GROQ_API_KEY
    ? {
        "mixtral-8x7b-32768": createGroq({
          apiKey: process.env.GROQ_API_KEY,
          baseURL: groqBaseURL,
        })("mixtral-8x7b-32768"),
        "llama-3.3-70b-versatile": createGroq({
          apiKey: process.env.GROQ_API_KEY,
          baseURL: groqBaseURL,
        })("llama-3.3-70b-versatile"),
        "gemma2-9b-it": createGroq({
          apiKey: process.env.GROQ_API_KEY,
          baseURL: groqBaseURL,
        })("gemma2-9b-it"),
      }
    : {}),
  ...(process.env.DEEPSEEK_API_KEY
    ? {
        "deepseek-chat": createDeepSeek({
          apiKey: process.env.DEEPSEEK_API_KEY,
          baseURL: deepseekBaseURL,
        })("deepseek-chat"),
      }
    : {}),
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
