import apiClient from "@/lib/axios";
import type { LanguageOption } from "@/types/editor";
import {
  LANGUAGE_OPTIONS,
  CP_LANGUAGE_OPTIONS,
  getLanguageOptionByName,
} from "@/constants/languages";

const JUDGE0_URL = process.env.NEXT_JUDGE0_URL || "http://localhost:2358";

export const getAllLanguages = async (): Promise<any> => {
  try {
    const response = await fetch(`${JUDGE0_URL}/languages`);
    if (!response.ok) {
      throw new Error(`Failed to fetch languages: ${response.statusText}`);
    }
    return response.json();
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('An unknown error occurred while fetching languages');
  }
}

/**
 * Fetch languages from the Judge0 /languages API (via getAllLanguages)
 * and merge them with the static CP_LANGUAGE_OPTIONS config.
 *
 * Only returns languages that are commonly used in Competitive Programming.
 * For each language returned by the API, if it matches a known CP language
 * by name (via getLanguageOptionByName), it's included using the static
 * config's mappings. This ensures that only CP-relevant languages are
 * displayed in the editor.
 */
export const fetchAndMergeLanguages = async (): Promise<LanguageOption[]> => {
  try {
    const apiLanguages: Array<{ id: number; name: string }> = await getAllLanguages();

    console.log("API Languages:", apiLanguages);

    // Get the set of CP language names for filtering
    const cpLanguageNames = new Set(
      CP_LANGUAGE_OPTIONS.map(lang => lang.judge0Name.toLowerCase())
    );

    // Map API language IDs to our CP static config using judge0Name
    const merged: LanguageOption[] = [];

    for (const lang of apiLanguages) {
      const staticLang = getLanguageOptionByName(lang.name);
      console.log("Processing lang:", lang.name, "Found:", !!staticLang);
      
      // Only include if it's in our CP languages list
      if (staticLang && cpLanguageNames.has(staticLang.judge0Name.toLowerCase())) {
        merged.push({
          ...staticLang,
          value: lang.id, // Use the API-provided ID
        });
      }
    }

    console.log("Merged CP languages:", merged);

    // Fallback to CP static config if API returns nothing useful
    if (merged.length === 0) {
      return CP_LANGUAGE_OPTIONS;
    }

    return merged;
  } catch (error) {
    console.error("Error fetching languages, falling back to CP config:", error);
    // If API is unreachable, fall back to CP static config
    return CP_LANGUAGE_OPTIONS;
  }
};

export const runCode = async (code: string, input: string, languageId: number): Promise<any> => {
  try {
    const response = await apiClient.post('/v1/user/editor/run', {
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