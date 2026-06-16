import { useEffect } from 'react';
import { useCurrentUser } from './AuthContext'; 

export const useMercureSync = (
  planningId: number | null, 
  onEventReceived: (action: string, data: any) => void
) => {
  const user = useCurrentUser();

  useEffect(() => {
    // 1. Si aucun planning n'est sélectionné, on ne s'abonne à rien
    if (!planningId) return;

    // 2. On construit l'URL exacte du Topic Mercure (doit correspondre à Symfony)
    const topic = encodeURIComponent(`https://gandara.com/planning/${planningId}`);
    
    // Remplace par l'URL locale de ton Hub Mercure (souvent le même port que l'API Symfony, ou un port spécifique fourni par Symfony CLI)
    const mercureHubUrl = `http://localhost:3000/.well-known/mercure?topic=${topic}`;

    // 3. On ouvre la connexion radio (EventSource)
    const eventSource = new EventSource(mercureHubUrl, {
      withCredentials: true // Important si ton hub Mercure est sécurisé
    });

    // 4. On écoute les messages entrants
    eventSource.onmessage = (event) => {
      console.log("📡 SIGNAL BRUT REÇU DE MERCURE :", event.data);
      try {
        const payload = JSON.parse(event.data);

        if (Number(payload.updatedBy) === Number(user.IdPersonnel)) {
        //  return;
        }

        // 5. On transmet l'action au composant parent (le Calendrier)
        onEventReceived(payload.action, payload.data);

      } catch (error) {
        console.error("Erreur lors de la lecture du message Mercure", error);
      }
    };

    return () => {
      eventSource.close();
    };
    
  }, [planningId, user.IdPersonnel, onEventReceived]);
};