"use client";

import { useState } from "react";
import SidebarWidget from "./SidebarWidget";

interface SubmitWidgetProps {
  problemId: string;
  languages?: { value: string; label: string }[];
}

export default function SubmitWidget({
  problemId,
  languages = [
    { value: "cpp", label: "GNU G++20 11.2.0 (64 bit)" },
    { value: "c", label: "GNU GCC C11 5.1.0" },
    { value: "python", label: "Python 3.8.10" },
    { value: "java", label: "Java 11.0.2" },
    { value: "javascript", label: "Node.js 15.0.0" },
  ],
}: SubmitWidgetProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]?.value || "");
  const [selectedFile, setSelectedFile] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0].name);
    }
  };

  return (
    <SidebarWidget title="Submit a solution">
      <form
        action={`/problems/${problemId}/submit`}
        method="POST"
        encType="multipart/form-data"
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <label htmlFor="language" className="text-sm text-[#333] whitespace-nowrap">
            Language:
          </label>
          <select
            id="language"
            name="language"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="flex-1 border border-[#E6E7EB] bg-white px-2 py-1 text-sm text-[#333] rounded-sm focus:outline-none focus:border-[#2563EB]"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sourceFile" className="text-sm text-[#333] whitespace-nowrap">
            Choose file:
          </label>
          <input
            type="file"
            id="sourceFile"
            name="sourceFile"
            onChange={handleFileChange}
            className="block w-full text-xs text-[#555] file:mr-2 file:py-1 file:px-3 file:rounded-sm file:border-0 file:text-xs file:font-medium file:bg-[#F4F4F4] file:text-[#333] hover:file:bg-[#E6E7EB]"
          />
        </div>

        <div className="text-center">
          <button
            type="submit"
            className="border border-[#E6E7EB] bg-white px-6 py-1.5 text-sm text-[#333] font-medium rounded-sm hover:bg-[#F4F4F4] transition-colors"
          >
            Submit
          </button>
        </div>
      </form>
    </SidebarWidget>
  );
}