import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "h-12" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon Symbol: Two arrows interacting with a house silhouette */}
      <svg viewBox="0 0 100 100" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        
        {/* Orange Part: Left arrow pointing down, forms left wall and left roof of house */}
        {/* Starts top center, goes left, down, forms arrow, goes back up inner edge */}
        <path d="M50 20 H20 C20 20 20 20 20 50 V 80 L 0 80 L 25 100 L 50 80 H 42 V 50 L 50 40 Z" fill="#F37D20" />
        
        {/* Blue Part: Right arrow pointing up, forms right wall and right roof of house */}
        {/* Starts bottom center, goes right, up, forms arrow, goes back down inner edge */}
        <path d="M50 80 H 80 C 80 80 80 80 80 50 V 20 L 100 20 L 75 0 L 50 20 H 58 V 50 L 50 60 Z" fill="#487A96" />

      </svg>
      
      {/* Text Part */}
      <div className="flex flex-col justify-center">
        <h1 className="text-4xl font-bold tracking-wider text-cfs-grey leading-none" style={{ fontFamily: 'sans-serif' }}>CFS</h1>
        <span className="text-xs uppercase tracking-[0.3em] text-cfs-grey mt-1">Facility</span>
      </div>
    </div>
  );
};