import React, { useState } from "react";
import { cn } from "../../lib/utils";

export function FlippingCard({
  className,
  frontContent,
  backContent,
  height = 300,
  width = 350,
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="[perspective:1000px]"
      style={{
        height: `${height}px`,
        width: `${width}px`,
      }}
      onClick={() => setIsFlipped((f) => !f)}
    >
      <div
        className={cn(
          "relative w-full h-full rounded-xl border border-neutral-200 bg-white shadow-lg transition-all duration-700 [transform-style:preserve-3d] cursor-pointer dark:border-neutral-800 dark:bg-neutral-950",
          isFlipped && "[transform:rotateY(180deg)]",
          className
        )}
      >
        {/* Front Face */}
        <div className="absolute inset-0 h-full w-full rounded-[inherit] [transform-style:preserve-3d] [backface-visibility:hidden] [transform:rotateY(0deg)]">
          <div className="h-full w-full">
            {frontContent}
          </div>
        </div>

        {/* Back Face */}
        <div className="absolute inset-0 h-full w-full rounded-[inherit] [transform-style:preserve-3d] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="h-full w-full">
            {backContent}
          </div>
        </div>
      </div>
    </div>
  );
}
