import React from "react";

interface SubstationIconProps extends React.SVGProps<SVGSVGElement> {}

export const SubstationIcon = (props: SubstationIconProps) => {
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
      {/* Transformer Tank Body - taking up lower half */}
      <rect x="4" y="14" width="16" height="8" rx="1" />
      
      {/* Cooling Fins (Vertical lines on body) */}
      <path d="M8 14v8" />
      <path d="M12 14v8" />
      <path d="M16 14v8" />

      {/* Left Bushing - Angled Out - ZigZag for Insulator Rings */}
      <path d="M7 14L5 4" />
      <path d="M4 6l4 1" /> {/* Insulator disc detail */}
      <path d="M5 10l3 1" /> {/* Insulator disc detail */}

      {/* Center Bushing - Straight - ZigZag for Insulator Rings */}
      <path d="M12 14V3" />
      <path d="M10 6h4" /> {/* Insulator disc detail */}
      <path d="M10 10h4" /> {/* Insulator disc detail */}

      {/* Right Bushing - Angled Out - ZigZag for Insulator Rings */}
      <path d="M17 14l2-10" />
      <path d="M16 6l4 1" /> {/* Insulator disc detail */}
      <path d="M16 10l3 1" /> {/* Insulator disc detail */}
    </svg>
  );
};