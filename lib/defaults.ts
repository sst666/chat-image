import { AppSettings } from "./types";

export const defaultSettings: AppSettings = {
  baseUrl: "https://api.bywlai.cn",
  apiKey: "",
  promptModel: "gpt-5.4",
  imageModel: "gpt-image-2-vip",
  backupImageModels: ["gpt-image-2", "gemini-3-pro-image-preview", "gemini-3.1-flash-image"],
  concurrency: 1,
  retries: 1,
};
