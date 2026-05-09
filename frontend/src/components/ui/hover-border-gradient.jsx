import { useState } from "react";

// Unique ID to avoid style conflicts if multiple instances exist
const STYLE_ID = "hover-border-gradient-styles";

function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @property --hbg-angle {
      syntax: "<angle>";
      inherits: false;
      initial-value: 0deg;
    }

    @keyframes hbg-spin {
      to { --hbg-angle: 360deg; }
    }

    .hbg-border {
      animation: hbg-spin 3s linear infinite;
      background: conic-gradient(
        from var(--hbg-angle),
        transparent 20%,
        rgba(255, 255, 255, 0.85) 35%,
        #3275F8 50%,
        rgba(255, 255, 255, 0.85) 65%,
        transparent 80%
      );
    }

    .hbg-border-slow {
      animation: hbg-spin 4s linear infinite;
    }

    .hbg-border-hover {
      background: conic-gradient(
        from var(--hbg-angle),
        transparent 0%,
        #3275F8 30%,
        rgba(100, 180, 255, 1) 50%,
        #3275F8 70%,
        transparent 100%
      ) !important;
      animation: hbg-spin 1.2s linear infinite !important;
    }
  `;
  document.head.appendChild(style);
}

export function HoverBorderGradient({
  children,
  containerClassName = "",
  className = "",
  as: Element = "button",
  duration = 3,
  onClick,
  active = false,
  ...props
}) {
  const [hovered, setHovered] = useState(false);

  // Inject the keyframe styles once on first render
  injectStyles();

  const borderClass = active || hovered
    ? "hbg-border hbg-border-hover"
    : "hbg-border hbg-border-slow";

  return (
    <Element
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-full p-px cursor-pointer select-none ${containerClassName}`}
      style={{ background: "transparent" }}
      {...props}
    >
      {/* Smoothly rotating conic-gradient border */}
      <div
        className={`absolute inset-0 rounded-full ${borderClass}`}
        style={{ filter: "blur(1px)" }}
      />

      {/* Dark fill — creates the border cutout */}
      <div
        className="absolute rounded-full"
        style={{
          inset: "1.5px",
          background: active ? "#0f172a" : "#09090b",
          transition: "background 0.3s",
        }}
      />

      {/* Content */}
      <span
        className={`relative z-10 px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-300 ${
          active ? "text-white" : hovered ? "text-white" : "text-gray-300"
        } ${className}`}
      >
        {children}
      </span>
    </Element>
  );
}

export default HoverBorderGradient;
