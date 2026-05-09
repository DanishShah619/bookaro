import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

export default function InteractiveHoverButton({
  text = 'Button',
  onClick,
  disabled = false,
  className = '',
}) {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (disabled || !onClick) return;
    onClick();
  };

  return (
    <>
      <style>{`
        @keyframes ihb-spin {
          to { transform: rotate(360deg); }
        }
        .ihb-spinner {
          animation: ihb-spin 0.75s linear infinite;
        }
        .ihb-root {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 160px;
          overflow: hidden;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.18);
          padding: 0.6rem 1.5rem;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          background: transparent;
          color: white;
          transition: border-color 0.3s;
          outline: none;
          gap: 0.5rem;
        }
        .ihb-root:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        /* The expanding dot */
        .ihb-dot {
          position: absolute;
          left: 1rem;
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: #ef4444;
          transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: center;
          z-index: 0;
        }
        .ihb-root:not(:disabled):hover .ihb-dot,
        .ihb-dot.active {
          transform: scale(38);
        }
        /* Static text (fades left on hover) */
        .ihb-label {
          position: relative;
          z-index: 1;
          transition: opacity 0.3s, transform 0.35s;
          opacity: 1;
          transform: translateX(0);
        }
        .ihb-root:not(:disabled):hover .ihb-label,
        .ihb-label.active {
          opacity: 0;
          transform: translateX(24px);
        }
        /* Hover content (arrow/check slides in from left) */
        .ihb-hover {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          color: white;
          opacity: 0;
          transform: translateX(-20px);
          transition: opacity 0.3s, transform 0.35s;
          pointer-events: none;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .ihb-root:not(:disabled):hover .ihb-hover,
        .ihb-hover.active {
          opacity: 1;
          transform: translateX(0);
        }
      `}</style>

      <button
        className={`ihb-root ${className}`}
        onClick={handleClick}
        disabled={disabled}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="ihb-dot" />
        <span className="ihb-label">{text}</span>
        <span className="ihb-hover">
          <span>{text}</span>
          <ArrowRight size={15} />
        </span>
      </button>
    </>
  );
}
