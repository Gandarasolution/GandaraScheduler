/**
 * @fileoverview Hook personnalisé pour le debouncing de valeurs
 * 
 * Ce hook permet de retarder la mise à jour d'une valeur jusqu'à ce qu'un 
 * certain délai se soit écoulé depuis le dernier changement. Utile pour 
 * optimiser les recherches et éviter les appels API excessifs.
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useEffect, useState } from 'react';

/**
 * Hook qui retourne une valeur debounced
 * @param value - La valeur à debouncer
 * @param delay - Le délai en millisecondes (par défaut: 300ms)
 * @returns La valeur debounced
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 * 
 * useEffect(() => {
 *   // Cette recherche ne s'exécutera que 500ms après la dernière frappe
 *   performSearch(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Créer un timer qui mettra à jour la valeur après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer si la valeur change avant la fin du délai
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
