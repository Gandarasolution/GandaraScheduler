import { useEffect } from 'react';
import Cookies from 'js-cookie';
import { useCurrentUser } from './AuthContext'; 

export const useMercureSync = (
  planningId: number | null, 
  onEventReceived: (action: string, data: any) => void,
  setNotification: (message: string) => void
) => {
  const user = useCurrentUser();

  useEffect(() => {
    if (!planningId) return;

    const mercureBaseUrl = Cookies.get('client_mercure_url');
    if (!mercureBaseUrl) {
      console.warn('Aucune URL Mercure disponible pour le client.');
      return;
    }

    const topic = encodeURIComponent(`https://gandara.com/planning/update`);
    const mercureHubUrl = `${mercureBaseUrl.replace(/\/$/, '')}/.well-known/mercure?topic=${topic}`;

    const eventSource = new EventSource(mercureHubUrl, {
      withCredentials: true
    });

    // 4. On écoute les messages entrants
    eventSource.onmessage = (event) => {
      console.log("📡 SIGNAL BRUT REÇU DE MERCURE :", event.data);
      try {
        const payload = JSON.parse(event.data);

        if (Number(payload.updatedBy) === Number(user.IdPersonnel)) {
          return;
        }

        // 5. On transmet l'action au composant parent (le Calendrier)
        onEventReceived(payload.action, payload.data);

      } catch (error) {
        console.error("Erreur lors de la lecture du message Mercure", error);
      }
    };

    eventSource.onerror = (error) => {
      if (eventSource.readyState === 0) {
        console.info("🔌 Connexion à Mercure interrompue. Tentative de reconnexion...");
      }
      else {
        setNotification("Erreur de connexion à Mercure. Veuillez vérifier votre connexion ou réessayer plus tard.");
        console.error("Erreur de connexion à Mercure", error);
      }
    };

    eventSource.onopen = () => {
        console.log("✅ Connecté à Mercure avec succès ! Le serveur a accepté le cookie.");
    };

    return () => {
      eventSource.close();
    };
    
  }, [planningId, user.IdPersonnel, onEventReceived]);
};