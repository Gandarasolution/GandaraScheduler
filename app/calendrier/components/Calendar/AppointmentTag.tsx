import React, { memo } from 'react';

interface AppointmentTagProps {
  tagName: string;
  color: string;
  textColor: string;
  isHovered: boolean;
  isResizing: boolean;
}

const AppointmentTag: React.FC<AppointmentTagProps> = ({
  tagName,
  color,
  textColor,
  isHovered,
  isResizing,
}) => {
  return (
    <div className="absolute right-0 top-2 z-30">
      <div 
        className={`flex items-center shadow-md overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isHovered && !isResizing ? 'max-w-[200px]' : 'max-w-[10px]'}`}
        style={{
          backgroundColor: isHovered ? color : 'white',
          borderRadius: '6px 0 0 6px',
          height: '22px'
        }}
        title={`Tag: ${tagName}`}
      >
        <span 
          className={`pl-3 pr-2 text-[10px] font-bold uppercase whitespace-nowrap transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
          style={{ color: textColor }}
        >
          {tagName}
        </span>
      </div>
    </div>
  );
};

export default memo(AppointmentTag);
