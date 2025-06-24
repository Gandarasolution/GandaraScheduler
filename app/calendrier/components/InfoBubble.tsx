"use client";
import React, { useEffect, useRef } from 'react';

interface InfoBubbleProps {
  content: string;
  position: { x: number; y: number };
  onClose: () => void;
}

const InfoBubble: React.FC<InfoBubbleProps> = ({ content, position, onClose }) => {
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={bubbleRef}
      className="fixed bg-gray-800 text-white p-2 rounded-md shadow-lg z-50 text-sm max-w-xs break-words"
      style={{
        left: position.x + 10,
        top: position.y + 10,
      }}
    >
      {content}
    </div>
  );
};

export default InfoBubble;