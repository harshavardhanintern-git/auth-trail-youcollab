import React from "react";

interface LogoProps {
  className?: string;
  transparent?: boolean;
}

export function Logo({ className = "h-12", transparent = false }: LogoProps) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 400 400" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ aspectRatio: "1/1" }}
    >
      {/* Background */}
      {!transparent && <rect width="400" height="400" rx="80" fill="#2353E9" />}
      
      {/* "you" */}
      <text 
        x="200" 
        y="180" 
        fontFamily="Geist, system-ui, -apple-system, sans-serif" 
        fontSize="85" 
        fontWeight="800" 
        fill={transparent ? "#3FE3FF" : "white"}
        textAnchor="middle"
        letterSpacing="-0.05em"
      >
        you
      </text>

      {/* "collab" */}
      <text 
        x="200" 
        y="255" 
        fontFamily="Geist, system-ui, -apple-system, sans-serif" 
        fontSize="85" 
        fontWeight="800" 
        fill="white"
        textAnchor="middle"
        letterSpacing="-0.05em"
      >
        collab
      </text>

      {/* Divider Line */}
      {!transparent ? (
        <>
          <defs>
            <linearGradient id="glow" x1="100" y1="285" x2="300" y2="285" gradientUnits="userSpaceOnUse">
              <stop stopColor="white" stopOpacity="0" />
              <stop offset="0.5" stopColor="white" stopOpacity="1" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M 100 285 L 300 285" stroke="url(#glow)" strokeWidth="2" />
          <path d="M 150 285 L 250 285" stroke="white" strokeWidth="4" filter="blur(2px)" />
        </>
      ) : (
        <path d="M 100 285 L 300 285" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="4" strokeLinecap="round" />
      )}

      {/* "By Social Kurry." */}
      <text 
        x="200" 
        y="320" 
        fontFamily="Geist, system-ui, -apple-system, sans-serif" 
        fontSize="18" 
        fontWeight="500" 
        fill="white"
        textAnchor="middle"
        opacity={transparent ? "0.4" : "0.9"}
      >
        By Social Kurry.
      </text>
    </svg>
  );
}

export default Logo;
