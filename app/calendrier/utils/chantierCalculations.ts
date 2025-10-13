/**
 * @fileoverview Utilitaires de calcul pour les chantiers
 * 
 * Fonctions de calcul des métriques des chantiers :
 * - DPF (Durée Planifiée Finale)
 * - RPF (Ressources Planifiées Finales)  
 * - AP (Avancement Planifié)
 * - SP (Somme Planifiée)
 * 
 * @module ChantierCalculations
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { ChantierEvent, Appointment } from '../types';

const HOURS_PER_DAY = 8;

/**
 * Calcule la DPF (Durée Planifiée Finale) d'un chantier
 * @param chantierId - ID du chantier
 * @param appointments - Liste des rendez-vous
 * @returns Durée en heures formatée
 */
export const calculateDPF = (chantierId: number, appointments: Appointment[]): string => {
  const chantierAppointments = appointments.filter(
    app => app.EventId === chantierId
  );
  
  if (chantierAppointments.length === 0) {
    return "0h";
  }

  const totalMinutes = chantierAppointments.reduce((total, app) => {
    const duration = app.endDate.getTime() - app.startDate.getTime();
    return total + Math.round(duration / (1000 * 60));
  }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return minutes > 0 ? `${hours}h${minutes}` : `${hours}h`;
};

/**
 * Calcule la RPF (Ressources Planifiées Finales) d'un chantier
 * @param chantier - Événement chantier
 * @param appointments - Liste des rendez-vous
 * @returns Nombre de jours planifiés
 */
export const calculateRPF = (chantier: ChantierEvent, appointments: Appointment[]): string => {
  const dpfString = calculateDPF(chantier.id, appointments);
  const dpfHours = parseFloat(dpfString.replace('h', '').replace(/\d+$/, ''));
  return Math.ceil(dpfHours / HOURS_PER_DAY).toString();
};

/**
 * Calcule l'AP (Avancement Planifié) d'un chantier
 * @param chantier - Événement chantier
 * @param appointments - Liste des rendez-vous
 * @returns Pourcentage d'avancement
 */
export const calculateAP = (chantier: ChantierEvent, appointments: Appointment[]): string => {
  // Utilise la valeur AP existante ou calcule à partir des données disponibles
  if (chantier.attributs.AP) return chantier.attributs.AP;
  
  const rpfString = calculateRPF(chantier, appointments);
  const rpfDays = parseFloat(rpfString) || 0;
  
  // Calcul basique basé sur les données disponibles
  return `${Math.round(rpfDays * 10)}%`;
};

/**
 * Calcule la SP (Somme Planifiée) d'un chantier
 * @param chantier - Événement chantier
 * @param appointments - Liste des rendez-vous
 * @returns Montant calculé
 */
export const calculateSP = (chantier: ChantierEvent, appointments: Appointment[]): string => {
  // Utilise la valeur SP existante ou calcule à partir des données disponibles
  if (chantier.attributs.SP) return chantier.attributs.SP;
  
  const rpfString = calculateRPF(chantier, appointments);
  const rpfDays = parseFloat(rpfString) || 0;
  
  // Calcul basique avec un taux moyen journalier de 500€
  return (500 * rpfDays).toFixed(2);
};