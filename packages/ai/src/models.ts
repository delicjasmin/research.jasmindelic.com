import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { isUnlimitedPlan } from "database";

export type ModelProvider = "openai" | "anthropic" | "google";

export type ModelId =
  | "gpt-4o-mini"
  | "gpt-4o"
  | "claude-haiku"
  | "claude-sonnet"
  | "gemini-flash";

export type ChatModelConfig = {
  label: string;
  hint: string;
  description: string;
  provider: ModelProvider;
  model: string;
  minPlan?: "pro";
};

export const CHAT_MODELS: Record<ModelId, ChatModelConfig> = {
  "gpt-4o-mini": {
    label: "GPT-4o Mini",
    hint: "Fast",
    description:
      "Quick and affordable. Great for straightforward questions about your document.",
    provider: "openai",
    model: "gpt-4o-mini",
  },
  "gpt-4o": {
    label: "GPT-4o",
    hint: "High",
    description:
      "OpenAI's most capable model. Best for complex analysis and nuanced answers.",
    provider: "openai",
    model: "gpt-4o",
    minPlan: "pro",
  },
  "claude-haiku": {
    label: "Claude Haiku",
    hint: "Fast",
    description:
      "Anthropic's fastest model. Good balance of speed and quality for everyday research.",
    provider: "anthropic",
    model: "claude-3-5-haiku-20241022",
  },
  "claude-sonnet": {
    label: "Claude Sonnet",
    hint: "High",
    description:
      "Strong reasoning and writing. Ideal for detailed, well-structured answers.",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    minPlan: "pro",
  },
  "gemini-flash": {
    label: "Gemini Flash",
    hint: "Fast",
    description:
      "Google's fast model with a large context window. Good for broad document questions.",
    provider: "google",
    model: "gemini-2.0-flash",
  },
};

export const DEFAULT_MODEL_ID: ModelId = "gpt-4o-mini";

export type ChatModelOption = {
  id: ModelId;
  label: string;
  hint: string;
  description: string;
  provider: ModelProvider;
  available: boolean;
  disabledReason?: "pro";
  minPlan?: "pro";
};

function getProviderApiKey(provider: ModelProvider): string | undefined {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "google":
      return process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  }
}

export function isProviderConfigured(provider: ModelProvider): boolean {
  return Boolean(getProviderApiKey(provider));
}

export function isModelId(value: string): value is ModelId {
  return value in CHAT_MODELS;
}

export function isModelAvailableForPlan(modelId: ModelId, plan: string): boolean {
  const config = CHAT_MODELS[modelId];
  if (config.minPlan === "pro") {
    return plan === "pro" || isUnlimitedPlan(plan);
  }
  return true;
}

export function listChatModels(plan: string): ChatModelOption[] {
  return (Object.entries(CHAT_MODELS) as [ModelId, ChatModelConfig][])
    .filter(([, config]) => isProviderConfigured(config.provider))
    .map(([id, config]) => {
      const available = isModelAvailableForPlan(id, plan);
      return {
        id,
        label: config.label,
        hint: config.hint,
        description: config.description,
        provider: config.provider,
        available,
        disabledReason:
          !available && config.minPlan === "pro" ? ("pro" as const) : undefined,
        minPlan: config.minPlan,
      };
    });
}

export function listAvailableChatModels(plan: string): ChatModelOption[] {
  return listChatModels(plan).filter((model) => model.available);
}

export function resolveModelId(
  modelId: string | undefined,
  plan: string,
): ModelId {
  const id = modelId ?? DEFAULT_MODEL_ID;

  if (!isModelId(id)) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  if (!isModelAvailableForPlan(id, plan)) {
    throw new Error(`Model ${id} is not available on your plan`);
  }

  const config = CHAT_MODELS[id];
  if (!isProviderConfigured(config.provider)) {
    throw new Error(`Model ${id} is not available`);
  }

  return id;
}

export function getChatModel(modelId: ModelId): LanguageModelV4 {
  const config = CHAT_MODELS[modelId];
  const apiKey = getProviderApiKey(config.provider);

  if (!apiKey) {
    throw new Error(`${config.provider} API key is not configured`);
  }

  switch (config.provider) {
    case "openai":
      return createOpenAI({ apiKey })(config.model);
    case "anthropic":
      return createAnthropic({ apiKey })(config.model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(config.model);
  }
}

export function getModelLabel(modelId: string): string | null {
  if (!isModelId(modelId)) return null;
  const config = CHAT_MODELS[modelId];
  return `${config.label} · ${config.hint}`;
}
