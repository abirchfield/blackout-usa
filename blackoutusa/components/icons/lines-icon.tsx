import React from "react";

type LinesIconProps = React.SVGProps<SVGSVGElement>;

export const LinesIcon = (props: LinesIconProps) => {
  // --- CONFIGURATION ---
  // Vertical Heights
  const H_PEAK = 18;       // Top triangle height
  const H_NECK = 66;       // Total straight neck height
  const H_LEGS = 45;       // Splayed leg height

  // Y-Coordinates
  const yStart = 5;
  const y1 = yStart + H_PEAK;       // Top of straight neck
  const yNode = y1 + (H_NECK / 2);  // X-brace intersection (middle of neck)
  const yWaist = y1 + H_NECK;       // Bottom of neck / Start of legs
  const yBase = yWaist + H_LEGS;    // Ground level

  // Arm Positioning (Floating relative to y1)
  const yArmTop = y1 + 25;
  const yArmBot = y1 + 50;

  // Horizontal Widths
  const c = 50;             // Center axis X
  const wNeck = 15;         // Half-width of neck
  const wBase = 30;         // Half-width of base feet
  const wArm = 60;          // Half-width of cross-arms

  // Calculated X-Coords
  const xNeckL = c - wNeck;
  const xNeckR = c + wNeck;
  const xBaseL = c - wBase;
  const xBaseR = c + wBase;

  // Dropper Tips
  const tipH = 10;
  const tTop_y = yArmTop + tipH;
  const tBot_y = yArmBot + tipH;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-12 3 124 136"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* --- STRUCTURE --- */}
      {/* Vertical Rails & Legs */}
      <path d={`M${xNeckL} ${y1} V${yWaist}`} />
      <path d={`M${xNeckR} ${y1} V${yWaist}`} />
      <path d={`M${xNeckL} ${yWaist} L${xBaseL} ${yBase}`} />
      <path d={`M${xNeckR} ${yWaist} L${xBaseR} ${yBase}`} />

      {/* --- ARMS --- */}
      {/* Peak Base */}
      <path d={`M${xNeckL} ${y1} H${xNeckR}`} />

      {/* Top Arm (Floating) */}
      <path d={`M${c - wArm} ${yArmTop} H${xNeckL}`} />
      <path d={`M${xNeckR} ${yArmTop} H${c + wArm}`} />
      {/* Braces -> Connect UP to y1 */}
      <path d={`M${c - wArm} ${yArmTop} L${xNeckL} ${y1}`} />
      <path d={`M${c + wArm} ${yArmTop} L${xNeckR} ${y1}`} />

      {/* Bottom Arm (Floating) */}
      <path d={`M${c - wArm} ${yArmBot} H${xNeckL}`} />
      <path d={`M${xNeckR} ${yArmBot} H${c + wArm}`} />
      {/* Braces -> Connect UP to yArmTop */}
      <path d={`M${c - wArm} ${yArmBot} L${xNeckL} ${yArmTop}`} />
      <path d={`M${c + wArm} ${yArmBot} L${xNeckR} ${yArmTop}`} />

      {/* Feet */}
      <path d={`M${xBaseL - 5} ${yBase} H${xBaseL + 15}`} />
      <path d={`M${xBaseR - 15} ${yBase} H${xBaseR + 5}`} />

      {/* Droppers */}
      <path d={`M${c - wArm} ${yArmTop} V${tTop_y}`} />
      <path d={`M${c + wArm} ${yArmTop} V${tTop_y}`} />
      <path d={`M${c - wArm} ${yArmBot} V${tBot_y}`} />
      <path d={`M${c + wArm} ${yArmBot} V${tBot_y}`} />

      {/* --- LATTICE --- */}
      {/* Peak Triangle */}
      <path d={`M${xNeckL} ${y1} L${c} ${yStart} L${xNeckR} ${y1}`} />

      {/* Neck X-Braces */}
      <path d={`M${xNeckL} ${y1} L${xNeckR} ${yNode}`} />
      <path d={`M${xNeckR} ${y1} L${xNeckL} ${yNode}`} />
      <path d={`M${xNeckL} ${yNode} L${xNeckR} ${yWaist}`} />
      <path d={`M${xNeckR} ${yNode} L${xNeckL} ${yWaist}`} />

      {/* Leg X-Brace */}
      <path d={`M${xNeckL} ${yWaist} L${xBaseR} ${yBase}`} />
      <path d={`M${xNeckR} ${yWaist} L${xBaseL} ${yBase}`} />
    </svg>
  );
};