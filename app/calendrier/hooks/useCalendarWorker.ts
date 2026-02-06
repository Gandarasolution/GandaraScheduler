/**
 * @fileoverview Hook pour utiliser le Web Worker de calendrier
 * 
 * Permet d'exécuter des calculs intensifs en arrière-plan
 * sans bloquer le thread principal de l'UI.
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';

type TaskType = 'FILTER_MONTHLY' | 'FILTER_DAILY' | 'CALCULATE_STATS' | 'DETECT_CONFLICTS' | 'GROUP_BY_DAY';

interface WorkerTask {
  type: TaskType;
  payload: any;
  taskId: string;
}

interface WorkerResponse {
  taskId: string;
  type: TaskType;
  status: 'success' | 'error' | 'ready';
  result?: any;
  error?: string;
}

export const useCalendarWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingTasksRef = useRef<Map<string, (result: any) => void>>(new Map());
  const taskIdCounter = useRef(0);

  // Initialiser le worker
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Worker) {
      try {
        const worker = new Worker('/workers/calendar-worker.js');
        
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { taskId, status, result, error, type } = event.data;
          
          // Worker prêt
          if (status === 'ready') {
            setIsReady(true);
            return;
          }
          
          // Résoudre la tâche en attente
          const resolver = pendingTasksRef.current.get(taskId);
          if (resolver) {
            if (status === 'success') {
              resolver(result);
            } else {
              console.error(`Worker error for ${type}:`, error);
              resolver(null);
            }
            pendingTasksRef.current.delete(taskId);
          }
        };
        
        worker.onerror = (error) => {
          console.error('Worker error:', error);
          setIsReady(false);
        };
        
        workerRef.current = worker;
        
        return () => {
          worker.terminate();
        };
      } catch (error) {
        console.warn('Web Worker not supported or failed to initialize:', error);
      }
    }
  }, []);

  /**
   * Exécute une tâche dans le worker
   */
  const executeTask = useCallback(<T = any>(type: TaskType, payload: any): Promise<T> => {
    return new Promise((resolve) => {
      if (!isReady || !workerRef.current) {
        // Fallback : exécuter en synchrone si worker non disponible
        console.warn('Worker not ready, executing synchronously');
        resolve(null as T);
        return;
      }
      
      const taskId = `task-${++taskIdCounter.current}`;
      
      // Stocker le resolver
      pendingTasksRef.current.set(taskId, resolve);
      
      // Envoyer la tâche au worker
      workerRef.current.postMessage({ type, payload, taskId });
      
      // Timeout de sécurité (10 secondes)
      setTimeout(() => {
        if (pendingTasksRef.current.has(taskId)) {
          console.warn(`Task ${taskId} timed out`);
          pendingTasksRef.current.delete(taskId);
          resolve(null as T);
        }
      }, 10000);
    });
  }, [isReady]);

  /**
   * Filtre les rendez-vous mensuels
   */
  const filterMonthlyAppointments = useCallback(async (
    appointments: any[],
    currentDate: Date,
    selectedEmployee: any,
    isAdmin: boolean,
    userId: number
  ) => {
    return executeTask('FILTER_MONTHLY', {
      appointments,
      currentDate: currentDate.toISOString(),
      selectedEmployee,
      isAdmin,
      userId,
    });
  }, [executeTask]);

  /**
   * Filtre les rendez-vous journaliers
   */
  const filterDailyAppointments = useCallback(async (
    appointments: any[],
    selectedDate: Date
  ) => {
    return executeTask('FILTER_DAILY', {
      appointments,
      selectedDate: selectedDate.toISOString(),
    });
  }, [executeTask]);

  /**
   * Calcule les statistiques mensuelles
   */
  const calculateStats = useCallback(async (appointments: any[]) => {
    return executeTask('CALCULATE_STATS', { appointments });
  }, [executeTask]);

  /**
   * Détecte les conflits d'horaires
   */
  const detectConflicts = useCallback(async (appointments: any[]) => {
    return executeTask('DETECT_CONFLICTS', { appointments });
  }, [executeTask]);

  /**
   * Groupe les rendez-vous par jour
   */
  const groupByDay = useCallback(async (appointments: any[]) => {
    return executeTask('GROUP_BY_DAY', { appointments });
  }, [executeTask]);

  return {
    isReady,
    filterMonthlyAppointments,
    filterDailyAppointments,
    calculateStats,
    detectConflicts,
    groupByDay,
  };
};
