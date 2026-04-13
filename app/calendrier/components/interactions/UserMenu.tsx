"use client";

import { useRouter } from 'next/navigation';
import { User } from '../../types';
import { Image } from '../ui/Image';
import { getCachedImageById } from '../../utils/imageCacheStore';

interface UserMenuProps {
  user: User;
}

export default function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();  
  const cachedUserImage = user.IdImage ? getCachedImageById(user.IdImage) : undefined;
  const avatarSource = user.IdImage
    ? (cachedUserImage?.image || user.IdImage)
    : null;

  const handleLogout = () => {
    // Supprimer les données de localStorage
    //localStorage.removeItem('user');
    //localStorage.removeItem('isAuthenticated');
    
    // Rediriger vers la page de login
    //router.push('/login');
  };

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div className="relative group">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold cursor-pointer poppins">
          {avatarSource ? (
            <Image
              image={avatarSource}
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
            {user.Email && (
              <p className="text-xs text-secondary mt-1 poppins">{user.Email}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-sm text-color-error hover:bg-error-light transition-colors flex items-center gap-2 poppins cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
