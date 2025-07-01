"use client";

import React, { useEffect } from "react";

/**
 * Props du composant Drawer
 * Affiche un tiroir latéral (drawer) pour afficher un formulaire ou du contenu additionnel.
 * Peut être masqué pendant un drag & drop.
 */
interface DrawerProps {
  open: boolean;
  children: React.ReactNode;
  onClose: () => void;
  isDragging: boolean;
}

/**
 * Composant Drawer
 * Affiche un panneau latéral avec en-tête, bouton de fermeture et contenu.
 * Se ferme avec la touche Escape ou le bouton.
 */
const Drawer: React.FC<DrawerProps> = ({ open, children, onClose, isDragging }) => {

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  return(
    <div className={`drawer-container${open ? " open" : ""} ${isDragging ? "hide-during-drag" : ""}`}>
      <div className="drawer-content">
        <div className="drawer-header">
          <span>Ajouter un événement</span>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>Fermer</button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
};

export default Drawer;