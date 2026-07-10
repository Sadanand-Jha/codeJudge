import { userApi, userDirectApi } from "@/utils/userAxiosInstance";
import type { LanguageOption } from "@/types/editor";
import {
  LANGUAGE_OPTIONS,
  getLanguageOptionByName,
} from "@/constants/languages";

export const getAllLanguages = async (): Promise<any> => {
  try {
    const response = await userDirectApi.get('/languages');
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('An unknown error occurred while fetching languages');
  }
}

/**
 * Fetch languages from the Judge0 /languages API (via getAllLanguages)
 * and merge them with the static LANGUAGE_OPTIONS config.
 *
 * For each language returned by the API, if it matches a known language
 * by name (via getLanguageOptionByName), it's included using the static
 * config's mappings. This ensures that newly added languages in Judge0
 * that we don't have static config for are excluded (they won't have
 * Monaco editor support anyway).
 */
export const fetchAndMergeLanguages = async (): Promise<LanguageOption[]> => {
  try {
    const apiLanguages: Array<{ id: number; name: string }> = await getAllLanguages();

    console.log(apiLanguages);

    // Map API language IDs to our static config using judge0Name
    const merged: LanguageOption[] = [];

    for (const lang of apiLanguages) {
      const staticLang = getLanguageOptionByName(lang.name);
      console.log("This is lang:", lang.name, staticLang);
      if (staticLang) {
        merged.push({
          ...staticLang,
          value: lang.id, // Use the API-provided ID
        });
      }
    }

    console.log("Merged languages:", merged);

    // Fallback to static config if API returns nothing useful
    if (merged.length === 0) {
      return LANGUAGE_OPTIONS;
    }

    return merged;
  } catch {
    // If API is unreachable, fall back to static config
    return LANGUAGE_OPTIONS;
  }
};

export const runCode = async (code: string, input: string, languageId: number): Promise<any> => {
  try {
    const response = await userDirectApi.post('/api/run', {
      language_id: languageId,
      source_code: code,
      stdin: input,
    });
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('An unknown error occurred while running code');
  }
}