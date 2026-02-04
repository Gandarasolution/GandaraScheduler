"use client";
import Calendrier from './calendrier/pages/index';
import React, { useCallback, useEffect, useState } from 'react';

import { ThemeType, useTheme } from './calendrier/utils/themeManager';
import { User } from './calendrier/types';
import { getUserById } from './datasource';

export default function Home() {

  const [user, setUser] = useState<User | undefined>(() => getUserById(1));

  const { theme, setTheme, availableThemes } = useTheme();
  
  // Fonction pour changer le thème et mettre à jour l'objet user
  const handleThemeChange = useCallback((newTheme: ThemeType) => {
    // 1. Mettre à jour l'objet user
    setUser(prevUser => prevUser ? ({
      ...prevUser,
      theme: newTheme
    }) : prevUser);
    
    // 2. Appliquer le thème visuellement
    setTheme(newTheme);
    
    // 3. TODO: Sauvegarder sur le backend
    // await updateUserTheme(user.id, newTheme);
  }, [setTheme]);
  
  // Appliquer le thème initial au chargement
  useEffect(() => {
    if (user) {
      setTheme(user.theme as ThemeType);
    }
  }, [user, setTheme]);

  if (!user) return null;

  return (
    <Calendrier user={user} onThemeChange={handleThemeChange} />
  );
}
