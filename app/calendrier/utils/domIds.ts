/**
 * Fonctions utilitaires pour générer des IDs DOM cohérents dans toute l'application.
 * Cela permet d'éviter les chaînes codées en dur et réduit le risque de discordance d'ID.
 */

export type RowType = 'employee' | 'group';

/**
 * Génère un ID DOM unique pour une ligne du calendrier.
 * @param type - Le type de la ligne ('employee' ou 'group').
 * @param id - L'identifiant unique de l'entité (ID employé ou ID groupe).
 * @returns Une chaîne ID (ex: "row-employee-123").
 */
export const getRowId = (type: RowType, id: number | string): string => {
  return `row-${type}-${id}`;
};

/**
 * Analyse un ID DOM pour extraire le type et l'ID.
 * @param domId - La chaîne ID DOM (ex: "row-employee-123").
 * @returns Un objet contenant le type et l'ID, ou null si invalide.
 */
export const parseRowId = (domId: string): { type: RowType; id: string } | null => {
  const match = domId.match(/^row-(employee|group)-(.+)$/);
  if (!match) return null;
  return {
    type: match[1] as RowType,
    id: match[2],
  };
};
