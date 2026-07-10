"use client";

interface EditorToolbarProps {
  fileName: string;
}

export default function EditorToolbar({ fileName }: EditorToolbarProps) {
  return (
    <div className="flex h-9 bg-[#1e1e1e] items-end px-2 gap-1 select-none">
      <div className="flex h-[32px] min-w-[120px] max-w-[200px] items-center justify-between bg-[#272822] px-3 text-[13px] text-[#e0e0e0] rounded-t-sm">
        <span>{fileName}</span>
        <span className="text-[14px] text-[#75715e] hover:text-[#f8f8f2] cursor-pointer ml-3">×</span>
      </div>
    </div>
  );
}