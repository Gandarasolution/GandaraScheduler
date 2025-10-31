"use client";
import Calendrier from './calendrier/pages/index';
import React, { useCallback, useEffect, useState } from 'react';

import icon from './calendrier/image/Icones/Evenement_Chantier.svg';
import { ThemeType, useTheme } from './calendrier/utils/themeManager';

export default function Home() {

  const [user, setUser] = useState({
    id: 1,
    name: "John Doe",
    role: "admin",
    theme: "light",
    image: icon.src
  })

  const { theme, setTheme, availableThemes } = useTheme();
  
  // Fonction pour changer le thème et mettre à jour l'objet user
  const handleThemeChange = useCallback((newTheme: ThemeType) => {
    // 1. Mettre à jour l'objet user
    setUser(prevUser => ({
      ...prevUser,
      theme: newTheme
    }));
    
    // 2. Appliquer le thème visuellement
    setTheme(newTheme);
    
    // 3. TODO: Sauvegarder sur le backend
    // await updateUserTheme(user.id, newTheme);
  }, [setTheme]);
  
  // Appliquer le thème initial au chargement
  useEffect(() => {
    setTheme(user.theme as ThemeType);
  }, []);

  return (
    <Calendrier user={user} onThemeChange={handleThemeChange} />
  );
}
