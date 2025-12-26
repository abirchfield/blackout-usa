import React from "react";

type LinesIconProps = React.SVGProps<SVGSVGElement> & {
  title?: string;
};

export const LinesIcon = ({ title = "Transmission line icon", ...props }: LinesIconProps) => {
  // --- CONFIGURATION ---
  const H_PEAK = 18;       // Triangle height
  const H_NECK = 66;       // Neck height
  const H_LEGS = 45;       // Leg height

  // Y-Coordinates
  const yStart = 5;
  const y1 = yStart + H_PEAK;       // Top of Neck (23)
  const yNode = y1 + (H_NECK / 2);  // Middle Node (56)
  const yWaist = y1 + H_NECK;       // Waist (89)
  const yBase = yWaist + H_LEGS;    // Base (134)

  // Arm Positions (Floating)
  const yArmTop = y1 + 25;
  const yArmBot = y1 + 50;

  // Widths (X-Coords)
  const c = 50;             // Center
  const wNeck = 15;         // Neck radius
  const wBase = 30;         // Base radius
  const wArm = 60;          // Arm radius

  const xNeckL = c - wNeck; const xNeckR = c + wNeck;
  const xBaseL = c - wBase; const xBaseR = c + wBase;

  // Dropper Tips
  const tipH = 10;
  const tTop_y = yArmTop + tipH;
  const tBot_y = yArmBot + tipH;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      // ViewBox:
      // X: -12 to 112 (Width 124) spans the 120-wide arms + padding
      // Y: 3 to 137 (Height 134) spans peak to base legs + padding
      viewBox="-12 3 124 134"
      role="img"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <title>{title}</title>
      {/* --- STRUCTURE --- */}
      {/* Rails & Legs */}
      <path d={`M${xNeckL} ${y1} V${yWaist}`} />
      <path d={`M${xNeckR} ${y1} V${yWaist}`} />
      <path d={`M${xNeckL} ${yWaist} L${xBaseL} ${yBase}`} />
      <path d={`M${xNeckR} ${yWaist} L${xBaseR} ${yBase}`} />

      {/* --- ARMS --- */}
      <path d={`M${xNeckL} ${y1} H${xNeckR}`} /> {/* Peak Base */}

      {/* Top Arm */}
      <path d={`M${c - wArm} ${yArmTop} H${xNeckL}`} />
      <path d={`M${xNeckR} ${yArmTop} H${c + wArm}`} />
      <path d={`M${c - wArm} ${yArmTop} L${xNeckL} ${y1}`} />
      <path d={`M${c + wArm} ${yArmTop} L${xNeckR} ${y1}`} />

      {/* Bottom Arm */}
      <path d={`M${c - wArm} ${yArmBot} H${xNeckL}`} />
      <path d={`M${xNeckR} ${yArmBot} H${c + wArm}`} />
      <path d={`M${c - wArm} ${yArmBot} L${xNeckL} ${yArmTop}`} />
      <path d={`M${c + wArm} ${yArmBot} L${xNeckR} ${yArmTop}`} />

      {/* Droppers */}
      <path d={`M${c - wArm} ${yArmTop} V${tTop_y}`} />
      <path d={`M${c + wArm} ${yArmTop} V${tTop_y}`} />
      <path d={`M${c - wArm} ${yArmBot} V${tBot_y}`} />
      <path d={`M${c + wArm} ${yArmBot} V${tBot_y}`} />

      {/* --- LATTICE --- */}
      <path d={`M${xNeckL} ${y1} L${c} ${yStart} L${xNeckR} ${y1}`} /> {/* Peak */}
      <path d={`M${xNeckL} ${y1} L${xNeckR} ${yNode}`} /> {/* Neck Top */}
      <path d={`M${xNeckR} ${y1} L${xNeckL} ${yNode}`} />
      <path d={`M${xNeckL} ${yNode} L${xNeckR} ${yWaist}`} /> {/* Neck Bot */}
      <path d={`M${xNeckR} ${yNode} L${xNeckL} ${yWaist}`} />
      <path d={`M${xNeckL} ${yWaist} L${xBaseR} ${yBase}`} /> {/* Legs */}
      <path d={`M${xNeckR} ${yWaist} L${xBaseL} ${yBase}`} />
    </svg>
  );
};