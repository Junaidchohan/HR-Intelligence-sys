import React from "react";

export const PRIMARY_BUTTON_CLASSES = 
  "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm transition-all duration-300 shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer flex items-center justify-center gap-2";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export default function PrimaryButton({ children, className = "", ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      className={`${PRIMARY_BUTTON_CLASSES} ${className}`}
    >
      {children}
    </button>
  );
}
