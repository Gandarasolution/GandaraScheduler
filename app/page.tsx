"use client";
import Calendrier from './calendrier/pages/index';
import React, { useEffect, useState } from 'react';

import icon from './calendrier/image/Icones/Chantier.png';
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
  
  useEffect(() => {
    setTheme(user.theme as ThemeType);
  }, []);

  return (
    <Calendrier user={user} setUser={setUser} />
  );
}
