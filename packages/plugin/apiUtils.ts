import { Notice, RequestUrlResponse, requestUrl } from "obsidian";
import { logMessage } from "./someUtils";
import { logger } from "./services/logger";

export async function makeApiRequest<T = any>(
  requestFn: () => Promise<RequestUrlResponse>
): Promise<T> {
  logMessage("Making API request", requestFn);
  const response: RequestUrlResponse = await requestFn();
  if (response.status >= 200 && response.status < 300) {
    return response.json as T;
  }
  if (response.json.error) {
    new Notice(`File Organizer error: ${response.json.error}`, 6000);
    throw new Error(response.json.error);
  }
  throw new Error("Unknown error");
}

export async function checkLicenseKey(
  serverUrl: string,
  key: string
): Promise<{ isValid: boolean; isTokenLimitError?: boolean }> {
  try {
    const response: RequestUrlResponse = await requestUrl({
      url: `${serverUrl}/api/check-key`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
    });
    console.log("response", response.json);
    
    if (response.status === 429 || (response.json && response.json.isTokenLimitError)) {
      return { isValid: true, isTokenLimitError: true };
    }
    
    return { isValid: response.status === 200 };
  } catch (error) {
    if (error && error.response) {
      try {
        const errorJson = JSON.parse(error.response);
        if (errorJson && errorJson.isTokenLimitError) {
          return { isValid: true, isTokenLimitError: true };
        }
      } catch (parseError) {
      }
    }
    
    logger.error("Error checking API key:", error);
    return { isValid: false };
  }
}
