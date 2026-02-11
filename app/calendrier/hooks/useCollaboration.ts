/**
 * @fileoverview Hook de collaboration en temps réel avec Yjs
 * 
 * Ce hook gère la synchronisation des rendez-vous entre plusieurs utilisateurs
 * en utilisant Yjs et y-websocket.
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Appointment } from '../types';

interface UseCollaborationProps {
  /** Nom unique du document Yjs (ex: "gandara-appointments") */
  docName: string;
  /** URL du serveur WebSocket */
  wsUrl?: string;
  /** Identifiant de l'utilisateur pour la présence */
  userId?: string | number;
  /** Nom de l'utilisateur pour la présence */
  userName?: string;
  /** Callback appelé quand les données changent */
  onAppointmentsChange?: (appointments: Appointment[]) => void;
  /** Activer/désactiver la collaboration */
  enabled?: boolean;
}

interface CollaborationState {
  /** Document Yjs partagé */
  doc: Y.Doc | null;
  /** Provider WebSocket */
  provider: WebsocketProvider | null;
  /** Map Yjs des rendez-vous */
  appointmentsMap: Y.Map<Appointment> | null;
  /** État de la connexion */
  isConnected: boolean;
  /** État de synchronisation */
  isSynced: boolean;
  /** Utilisateurs actuellement connectés */
  connectedUsers: Array<{ id: string | number; name: string; color: string }>;
}

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:1234';

export const useCollaboration = ({
  docName,
  wsUrl = WEBSOCKET_URL,
  userId = 'anonymous',
  userName = 'Utilisateur',
  onAppointmentsChange,
  enabled = true
}: UseCollaborationProps) => {
  const [state, setState] = useState<CollaborationState>({
    doc: null,
    provider: null,
    appointmentsMap: null,
    isConnected: false,
    isSynced: false,
    connectedUsers: []
  });

  const unsubscribeRef = useRef<(() => void)[]>([]);

  // Initialisation de Yjs et connexion WebSocket
  useEffect(() => {
    if (!enabled) return;

    console.log('🔄 Initialisation de la collaboration...');

    // Création du document Yjs
    const doc = new Y.Doc();
    const appointmentsMap = doc.getMap<Appointment>('appointments');

    // Connexion au serveur WebSocket
    const provider = new WebsocketProvider(wsUrl, docName, doc, {
      connect: true
    });

    // Définir les informations de présence
    provider.awareness.setLocalState({
      user: {
        id: userId,
        name: userName,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16) // Couleur aléatoire
      }
    });

    // Gestion des événements de connexion
    provider.on('status', (event: { status: string }) => {
      console.log('📡 Statut WebSocket:', event.status);
      setState(prev => ({ ...prev, isConnected: event.status === 'connected' }));
    });

    provider.on('sync', (isSynced: boolean) => {
      console.log('🔄 Synchronisation:', isSynced ? 'complète' : 'en cours');
      setState(prev => ({ ...prev, isSynced }));
    });

    // Écoute des changements sur les rendez-vous
    const observeAppointments = () => {
      const appointments: Appointment[] = [];
      appointmentsMap.forEach((value, key) => {
        appointments.push(value);
      });
      
      if (onAppointmentsChange) {
        onAppointmentsChange(appointments);
      }
    };

    appointmentsMap.observe(observeAppointments);
    unsubscribeRef.current.push(() => appointmentsMap.unobserve(observeAppointments));

    // Gestion de la présence (utilisateurs connectés)
    const updateConnectedUsers = () => {
      const users = Array.from(provider.awareness.getStates().entries())
        .map(([clientId, state]: [number, any]) => ({
          id: state.user?.id || clientId,
          name: state.user?.name || 'Utilisateur',
          color: state.user?.color || '#999999'
        }))
        .filter(user => user.id !== userId); // Exclure l'utilisateur actuel

      setState(prev => ({ ...prev, connectedUsers: users }));
    };

    provider.awareness.on('change', updateConnectedUsers);
    unsubscribeRef.current.push(() => provider.awareness.off('change', updateConnectedUsers));

    // Mise à jour de l'état
    setState({
      doc,
      provider,
      appointmentsMap,
      isConnected: provider.wsconnected,
      isSynced: false,
      connectedUsers: []
    });

    // Nettoyage
    return () => {
      console.log('🔌 Déconnexion de la collaboration...');
      unsubscribeRef.current.forEach(unsub => unsub());
      unsubscribeRef.current = [];
      provider.destroy();
      doc.destroy();
    };
  }, [docName, wsUrl, userId, userName, enabled]);

  /**
   * Ajoute ou met à jour un rendez-vous
   */
  const setAppointment = useCallback((appointment: Appointment) => {
    if (!state.appointmentsMap) return;
    
    state.doc?.transact(() => {
      state.appointmentsMap?.set(appointment.id.toString(), appointment);
    });
  }, [state.appointmentsMap, state.doc]);

  /**
   * Supprime un rendez-vous
   */
  const deleteAppointment = useCallback((appointmentId: number) => {
    if (!state.appointmentsMap) return;
    
    state.doc?.transact(() => {
      state.appointmentsMap?.delete(appointmentId.toString());
    });
  }, [state.appointmentsMap, state.doc]);

  /**
   * Met à jour plusieurs rendez-vous en une seule transaction
   */
  const setAppointments = useCallback((appointments: Appointment[]) => {
    if (!state.appointmentsMap || !state.doc) return;
    
    state.doc.transact(() => {
      appointments.forEach(appointment => {
        state.appointmentsMap?.set(appointment.id.toString(), appointment);
      });
    });
  }, [state.appointmentsMap, state.doc]);

  /**
   * Récupère tous les rendez-vous actuels
   */
  const getAppointments = useCallback((): Appointment[] => {
    if (!state.appointmentsMap) return [];
    
    const appointments: Appointment[] = [];
    state.appointmentsMap.forEach((value) => {
      appointments.push(value);
    });
    return appointments;
  }, [state.appointmentsMap]);

  /**
   * Efface tous les rendez-vous (à utiliser avec précaution)
   */
  const clearAppointments = useCallback(() => {
    if (!state.appointmentsMap || !state.doc) return;
    
    state.doc.transact(() => {
      state.appointmentsMap?.clear();
    });
  }, [state.appointmentsMap, state.doc]);

  /**
   * Synchronise les données initiales avec Yjs
   */
  const syncInitialData = useCallback((appointments: Appointment[]) => {
    if (!state.appointmentsMap || !state.doc || !state.isSynced) return;
    
    // Ne synchroniser que si le document est vide (premier client)
    if (state.appointmentsMap.size === 0) {
      console.log('📤 Synchronisation des données initiales...');
      setAppointments(appointments);
    }
  }, [state.appointmentsMap, state.doc, state.isSynced, setAppointments]);

  return {
    // État
    isConnected: state.isConnected,
    isSynced: state.isSynced,
    connectedUsers: state.connectedUsers,
    
    // Méthodes
    setAppointment,
    deleteAppointment,
    setAppointments,
    getAppointments,
    clearAppointments,
    syncInitialData,
    
    // Objets Yjs (pour usage avancé)
    doc: state.doc,
    provider: state.provider,
    appointmentsMap: state.appointmentsMap
  };
};
