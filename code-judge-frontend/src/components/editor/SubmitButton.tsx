"use client";

interface SubmitButtonProps {
  onClick: () => void;
  isSubmitting: boolean;
}

export default function SubmitButton({ onClick, isSubmitting }: SubmitButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isSubmitting}
      className="text-[#66D9EF] hover:text-white font-medium ml-3"
    >
      {isSubmitting ? "Submitting..." : "Submit"}
    </button>
  );
}