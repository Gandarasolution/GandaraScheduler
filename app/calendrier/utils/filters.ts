import { Employee, Appointment, Filter, CalendarConfig, DimensionItem, DimensionType, Groupe } from '../types';

// Types pour l'accès sécurisé aux propriétés
type EmployeeField = keyof Employee;
type AppointmentField = keyof Appointment;

// Fonction d'accès sécurisé aux propriétés d'employé
function getEmployeeProperty(employee: Employee, field: string): any {
  return employee[field as EmployeeField];
}

// Fonction d'accès sécurisé aux propriétés de rendez-vous
function getAppointmentProperty(appointment: Appointment, field: string): any {
  return appointment[field as AppointmentField];
}

// Fonction pour appliquer les filtres aux employés
export function applyFiltersToEmployees(employees: Employee[], filters: Filter[]): Employee[] {
  return employees.filter(employee => {
    return filters.every(filter => {
      switch (filter.type) {
        case 'equals':
          return getEmployeeProperty(employee, filter.field) === filter.value;
        case 'contains':
          return String(getEmployeeProperty(employee, filter.field)).toLowerCase().includes(String(filter.value).toLowerCase());
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(getEmployeeProperty(employee, filter.field));
        default:
          return true;
      }
    });
  });
}

// Fonction pour appliquer les filtres aux rendez-vous
export function applyFiltersToAppointments(
  appointments: Appointment[], 
  filters: Filter[], 
  employees: Employee[]
): Appointment[] {
  return appointments.filter(appointment => {
    // Trouver l'employé associé au rendez-vous
    const employee = employees.find(emp => emp.id === Number(appointment.employeeId));
    
    return filters.every(filter => {
      switch (filter.type) {
        case 'equals':
          // Si le filtre concerne un champ d'employé, utiliser les données de l'employé
          if (filter.field === 'pole' || filter.field === 'contrat' || filter.field === 'groupId') {
            return employee ? getEmployeeProperty(employee, filter.field) === filter.value : false;
          }
          // Sinon, utiliser les données du rendez-vous
          return getAppointmentProperty(appointment, filter.field) === filter.value;
        case 'contains':
          if (filter.field === 'pole' || filter.field === 'contrat' || filter.field === 'groupId') {
            return employee ? String(getEmployeeProperty(employee, filter.field)).toLowerCase().includes(String(filter.value).toLowerCase()) : false;
          }
          return String(getAppointmentProperty(appointment, filter.field)).toLowerCase().includes(String(filter.value).toLowerCase());
        case 'in':
          if (filter.field === 'pole' || filter.field === 'contrat' || filter.field === 'groupId') {
            return employee ? Array.isArray(filter.value) && filter.value.includes(getEmployeeProperty(employee, filter.field)) : false;
          }
          return Array.isArray(filter.value) && filter.value.includes(getAppointmentProperty(appointment, filter.field));
        case 'date_range':
          if (filter.field === 'startDate' || filter.field === 'endDate') {
            const date = new Date(getAppointmentProperty(appointment, filter.field));
            const [start, end] = filter.value as [Date, Date];
            return date >= start && date <= end;
          }
          return true;
        default:
          return true;
      }
    });
  });
}

// Fonction pour transformer les données selon la dimension
export function getDimensionItems(
  dimension: DimensionType, 
  employees: Employee[], 
  groups: Groupe[]
): DimensionItem[] {
  switch (dimension) {
    case 'employee':
      return employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        avatar: emp.avatar,
        groupId: emp.groupId,
        data: emp
      }));
    
    case 'group':
      return groups.map(group => ({
        id: group.id,
        name: group.name,
        data: group
      }));
    
    case 'contract':
      const contracts = ['CDI', 'CDD', 'Intérimaire'];
      return contracts.map(contract => ({
        id: contract,
        name: contract,
        data: { contract }
      }));
    
    case 'type':
      const types = ['Chantier', 'Absence', 'Autre'];
      return types.map(type => ({
        id: type,
        name: type,
        data: { type }
      }));
    
    case 'pole':
      const poles = Array.from(new Set(employees.map(emp => emp.pole)));
      return poles.map(pole => ({
        id: pole,
        name: pole,
        data: { pole }
      }));
    
    default:
      return [];
  }
}

// Fonction pour regrouper les employés selon la dimension
export function groupEmployeesByDimension(
  employees: Employee[], 
  dimension: DimensionType,
  groups: Groupe[]
): { [key: string]: Employee[] } {
  const result: { [key: string]: Employee[] } = {};
  
  switch (dimension) {
    case 'employee':
      employees.forEach(emp => {
        result[emp.id] = [emp];
      });
      break;
    
    case 'group':
      employees.forEach(emp => {
        const groupKey = emp.groupId ? emp.groupId.toString() : 'no-group';
        if (!result[groupKey]) result[groupKey] = [];
        result[groupKey].push(emp);
      });
      break;
    
    case 'contract':
      employees.forEach(emp => {
        if (!result[emp.type]) result[emp.type] = [];
        result[emp.type].push(emp);
      });
      break;
    
    case 'pole':
      employees.forEach(emp => {
        if (!result[emp.pole]) result[emp.pole] = [];
        result[emp.pole].push(emp);
      });
      break;
    
    default:
      result['all'] = employees;
  }
  
  return result;
}
