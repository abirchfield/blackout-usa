import React from "react";

interface SubstationIconProps extends React.SVGProps<SVGSVGElement> {}

export const SubstationIcon = (props: SubstationIconProps) => {
  // --- CONFIGURATION VARIABLES (Internal Grid 0-100) ---
  // Note: The viewBox is cropped to "7 2 86 86" to fit these elements tightly.

  // 1. Main Tank Geometry
  const tX = 15;
  const tY = 35;
  const tW = 70;
  const tH = 50;

  // 2. Cooling Vents (Floating)
  const vPadY = 10;
  const vTop = tY + vPadY;
  const vBot = (tY + tH) - vPadY;
  const cX = 50; // Center X
  const vGap = 12; // Spacing between vents

  // 3. Bushing Geometry (The "Poles")
  // Local Coordinates: (0,0) is attachment point. Y is negative (Up).
  const stemTip = -30; 
  const topBarY = -22; 
  const midBarY = -16;
  const botBarY = -10;
  
  const barW = 14;     
  const halfBar = barW / 2;
  const bBaseY = 35;   

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      // CROPPED VIEWBOX: 
      // X=7 (Left edge of tilted bushing)
      // Y=2 (Top tip of center stem)
      // W=86, H=86 (Tightly wraps to bottom tank edge at 87)
      viewBox="7 2 86 86"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* --- MAIN TANK --- */}
      <rect x={tX} y={tY} width={tW} height={tH} rx="3" />

      {/* --- COOLING VENTS --- */}
      <path d={`M${cX} ${vTop} V${vBot}`} />
      <path d={`M${cX - vGap} ${vTop} V${vBot}`} />
      <path d={`M${cX + vGap} ${vTop} V${vBot}`} />
      <path d={`M${cX - vGap * 2} ${vTop} V${vBot}`} />
      <path d={`M${cX + vGap * 2} ${vTop} V${vBot}`} />

      {/* --- BUSHINGS --- */}
      
      {/* 1. LEFT BUSHING (Rotated -25 deg) */}
      <g transform={`translate(${tX + 10}, ${bBaseY}) rotate(-25)`}>
        <path d={`M0 0 V${stemTip}`} />
        <path d={`M${-halfBar} ${topBarY} H${halfBar}`} />
        <path d={`M${-halfBar} ${midBarY} H${halfBar}`} />
        <path d={`M${-halfBar} ${botBarY} H${halfBar}`} />
      </g>

      {/* 2. CENTER BUSHING (Straight) */}
      <g transform={`translate(${cX}, ${bBaseY})`}>
        <path d={`M0 0 V${stemTip}`} />
        <path d={`M${-halfBar} ${topBarY} H${halfBar}`} />
        <path d={`M${-halfBar} ${midBarY} H${halfBar}`} />
        <path d={`M${-halfBar} ${botBarY} H${halfBar}`} />
      </g>

      {/* 3. RIGHT BUSHING (Rotated +25 deg) */}
      <g transform={`translate(${tX + tW - 10}, ${bBaseY}) rotate(25)`}>
        <path d={`M0 0 V${stemTip}`} />
        <path d={`M${-halfBar} ${topBarY} H${halfBar}`} />
        <path d={`M${-halfBar} ${midBarY} H${halfBar}`} />
        <path d={`M${-halfBar} ${botBarY} H${halfBar}`} />
      </g>
    </svg>
  );
};