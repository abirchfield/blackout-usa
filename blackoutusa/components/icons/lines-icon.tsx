import React from "react";

interface LinesIconProps extends React.SVGProps<SVGSVGElement> {}

export const LinesIcon = (props: LinesIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Main Tower Structure - The iconic "waist" shape */}
      <path d="M7 21L10 3" />
      <path d="M17 21L14 3" />
      <path d="M8 21h8" /> {/* Base */}
      
      {/* Top Cross-arm & Insulators */}
      <path d="M8 6h8" />
      <path d="M8 6v2" />  {/* Left Insulator */}
      <path d="M16 6v2" /> {/* Right Insulator */}
      
      {/* Middle Cross-arm & Insulators (Wider) */}
      <path d="M6 11h12" />
      <path d="M6 11v2" />  {/* Left Insulator */}
      <path d="M18 11v2" /> {/* Right Insulator */}

      {/* Bottom Cross-arm & Insulators */}
      <path d="M8 16h8" />
      <path d="M8 16v3" />  {/* Left Insulator */}
      <path d="M7 19c1 0 2 0 2 0" /> {/* Conductor attachment hint */}
      <path d="M16 16v3" /> {/* Right Insulator */}
      <path d="M15 19c1 0 2 0 2 0" /> {/* Conductor attachment hint */}
    </svg>
  );
};