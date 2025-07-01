import { JSX, memo, useEffect } from "react";
import { Appointment } from "../types";

interface RightClickComponentProps {
  open: boolean;
  coordinates: { x: number; y: number } | null;
  rightClickItem: { label: string; logo: JSX.Element, action?: () => void }[];
  onClose: () => void;
}

const RightClickComponent = ({ 
  open, 
  coordinates, 
  rightClickItem, 
  onClose 
}: RightClickComponentProps) => {

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

  // Ferme le menu contextuel si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (open && !target.closest('.rightClickComponent')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  return (
    <div
      className={`
          rightClickComponent      
          fixed flex flex-col bg-white border border-gray-300 rounded shadow-lg z-50 p-2 rounded-md
          transition-all duration-200
      `}      
      style={{ 
        top: coordinates?.y, 
        left: coordinates?.x,
        display: open ? 'flex' : 'none',
      }}
    >
      {rightClickItem.map((item) => (
        <div 
          key={item.label} 
          className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => {
            item.action && item.action();
            onClose();
          }}
        >
          {item.logo}
          <span className="ml-2">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default memo(RightClickComponent);