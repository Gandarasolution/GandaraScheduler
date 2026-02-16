/**
 * @fileoverview Web Worker pour calculs intensifs du calendrier
 * 
 * Décharge le thread principal des calculs lourds :
 * - Filtrage des rendez-vous
 * - Calcul des statistiques mensuelles
 * - Détection des conflits d'horaires
 * - Groupement et tri des données
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

// ===== FONCTIONS DE FILTRAGE =====

/**
 * Filtre les rendez-vous pour un mois donné
 */
function filterMonthlyAppointments(appointments, currentDate, selectedEmployee, isAdmin, userId) {
  const monthStart = new Date(currentDate);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const monthEnd = new Date(currentDate);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  monthEnd.setHours(23, 59, 59, 999);
  
  const monthStartTime = monthStart.getTime();
  const monthEndTime = monthEnd.getTime();
  
  let filteredApps = appointments;
  
  // Filtre par utilisateur si non-admin
  if (!isAdmin) {
    filteredApps = appointments.filter(app => app.employeeId === userId);
  }
  
  // Filtre par employé sélectionné et par mois
  return filteredApps.filter(app => {
    const matchesEmployee = !selectedEmployee || app.employeeId === selectedEmployee.id;
    const isInMonth = app.startDate <= monthEndTime && app.endDate >= monthStartTime;
    return matchesEmployee && isInMonth;
  });
}

/**
 * Filtre les rendez-vous pour un jour donné
 */
function filterDailyAppointments(appointments, selectedDate) {
  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);
  
  const dayStartTime = dayStart.getTime();
  const dayEndTime = dayEnd.getTime();
  
  return appointments.filter(app => 
    app.startDate <= dayEndTime && app.endDate >= dayStartTime
  );
}

// ===== STATISTIQUES =====

/**
 * Calcule les statistiques mensuelles
 */
function calculateMonthlyStats(appointments) {
  const stats = {
    total: appointments.length,
    byType: {},
    byEmployee: {},
    totalHours: 0,
    conflicts: [],
  };
  
  appointments.forEach(app => {
    // Par type
    stats.byType[app.type] = (stats.byType[app.type] || 0) + 1;
    
    // Par employé
    stats.byEmployee[app.employeeId] = (stats.byEmployee[app.employeeId] || 0) + 1;
    
    // Heures totales
    const hours = (app.endDate - app.startDate) / (1000 * 60 * 60);
    stats.totalHours += hours;
  });
  
  return stats;
}

/**
 * Détecte les conflits d'horaires
 */
function detectConflicts(appointments) {
  const conflicts = [];
  const sorted = [...appointments].sort((a, b) => a.startDate - b.startDate);
  
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const app1 = sorted[i];
      const app2 = sorted[j];
      
      // Même employé et chevauchement d'horaires
      if (app1.employeeId === app2.employeeId) {
        const hasOverlap = app1.startDate < app2.endDate && app1.endDate > app2.startDate;
        
        if (hasOverlap) {
          conflicts.push({
            appointment1: app1,
            appointment2: app2,
            employeeId: app1.employeeId,
            overlapStart: Math.max(app1.startDate, app2.startDate),
            overlapEnd: Math.min(app1.endDate, app2.endDate),
          });
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * Groupe les rendez-vous par jour
 */
function groupByDay(appointments) {
  const grouped = {};
  
  appointments.forEach(app => {
    const dayKey = new Date(app.startDate).toISOString().split('T')[0];
    
    if (!grouped[dayKey]) {
      grouped[dayKey] = [];
    }
    
    grouped[dayKey].push(app);
  });
  
  // Trier les rendez-vous de chaque jour
  Object.keys(grouped).forEach(day => {
    grouped[day].sort((a, b) => a.startDate - b.startDate);
  });
  
  return grouped;
}

// ===== GESTIONNAIRE DE MESSAGES =====

self.addEventListener('message', (event) => {
  const { type, payload, taskId } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'FILTER_MONTHLY':
        result = filterMonthlyAppointments(
          payload.appointments,
          payload.currentDate,
          payload.selectedEmployee,
          payload.isAdmin,
          payload.userId
        );
        break;
        
      case 'FILTER_DAILY':
        result = filterDailyAppointments(
          payload.appointments,
          payload.selectedDate
        );
        break;
        
      case 'CALCULATE_STATS':
        result = calculateMonthlyStats(payload.appointments);
        break;
        
      case 'DETECT_CONFLICTS':
        result = detectConflicts(payload.appointments);
        break;
        
      case 'GROUP_BY_DAY':
        result = groupByDay(payload.appointments);
        break;
        
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    // Répondre avec succès
    self.postMessage({
      taskId,
      type,
      status: 'success',
      result,
    });
    
  } catch (error) {
    // Répondre avec erreur
    self.postMessage({
      taskId,
      type,
      status: 'error',
      error: error.message,
    });
  }
});

// Confirmer que le worker est prêt
self.postMessage({ status: 'ready' });
