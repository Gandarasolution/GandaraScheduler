"use client";

import { useRouter } from 'next/navigation';
import { User } from '../../types';
import { getCachedImageById } from '../../utils/imageCacheStore';
import { useAuth } from '../../hooks/utils/AuthContext';

interface UserMenuProps {
  user: User;
}

export default function UserMenu({ user }: UserMenuProps) {
  const { setCurrentPlanningId, logout } = useAuth();


  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div className="relative group">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold cursor-pointer poppins">
          {user.Image ? (
            <img
              src={user.Image.image}
              alt="Avatar"
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span className="text-lg">{user.Nom.charAt(0).toUpperCase()}</span>
          )}
        </div>
        
        {/* Menu déroulant */}
        <div className="absolute right-0 mt-2 w-48 bg-secondary-bg rounded-lg shadow-lg border border-light opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="p-3 border-b border-light">
            <p className="text-sm font-medium text-primary poppins">{user.Nom} {user.Prenom}</p>
          </div>
          <button
            onClick={logout}
            className="w-full px-4 py-2 text-left text-sm text-color-error hover:bg-error-light transition-colors flex items-center gap-2 poppins cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
          <button
            onClick={() => setCurrentPlanningId(-1)}
            className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-primary-50 transition-colors flex items-center gap-2 poppins cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-planning-change">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              
              <line x1="8" y1="14" x2="16" y2="14"></line>
              <polyline points="14 12 16 14 14 16"></polyline>
              <line x1="16" y1="18" x2="8" y2="18"></line>
              <polyline points="10 16 8 18 10 20"></polyline>
            </svg>
             Changer de planning
          </button>
        </div>
      </div>
    </div>
  );
}
