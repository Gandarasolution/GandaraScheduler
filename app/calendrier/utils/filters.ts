import { User, Appointment, Filter, DimensionItem, Groupe, GroupingLevel, GroupingLevels, FilterCategories } from '../types';

// Types pour l'accès sécurisé aux propriétés
type UserField = keyof User;
type AppointmentField = keyof Appointment;

// Fonction d'accès sécurisé aux propriétés d'employé
function getEmployeeProperty(employee: User, field: string): any {
  return employee[field as UserField];
}

// Fonction d'accès sécurisé aux propriétés de rendez-vous
function getAppointmentProperty(appointment: Appointment, field: string): any {
  return appointment[field as AppointmentField];
}

// Fonction utilitaire pour extraire tous les filtres de filterCategories
export function getFlatFilters(filterCategories?: FilterCategories): Filter[] {
  if (!filterCategories) return [];
  
  const allFilters: Filter[] = [];
  
  if (filterCategories.personnel) {
    allFilters.push(...filterCategories.personnel);
  }
  
  if (filterCategories.evenements && !Array.isArray(filterCategories.evenements)) {
    allFilters.push(...filterCategories.evenements.filters);
  }
  
  return allFilters;
}

// Fonction pour appliquer les filtres aux employés
export function applyFiltersToEmployees(employees: User[], filters: Filter[]): User[] {
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
  searchQuery: string,
  employees: User[]
): Appointment[] {
  
  // Optimisation: Créer une Map pour O(1) lookup des employés
  const employeeMap = new Map<number, User>();
  employees.forEach(emp => employeeMap.set(emp.IdPersonnel, emp));
  
  return appointments.filter(appointment => {
    // Trouver l'employé associé au rendez-vous avec O(1) lookup
    const employee = employeeMap.get(Number(appointment.Employee?.IdPersonnel));

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const appointmentMatches = 
        String(appointment.AnnotationPlanningEvenement).toLowerCase().includes(query) ||
        String(appointment.Type).toLowerCase().includes(query);
      const employeeMatches = employee ? String(employee.Nom).toLowerCase().includes(query) : false;

      if (!appointmentMatches && !employeeMatches) {
        return false;
      }
    }
    
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
            const date = getAppointmentProperty(appointment, filter.field);
            const [start, end] = filter.value as [number, number];
            return date >= start && date <= end;
          }
          return true;
        default:
          return true;
      }
    });
  });
}

// Interface pour une structure hiérarchique de groupes
export interface HierarchicalGroupItem {
  id: string | number;
  name: string;
  level: number; // 1 pour level1, 2 pour level2
  children?: HierarchicalGroupItem[];
  employees?: User[];
  data?: any;
}

// Fonction pour obtenir les éléments de dimension avec hiérarchie
export function getHierarchicalDimensionItems(
  groupingLevels: GroupingLevels | undefined,
  employees: User[],
  groups: Groupe[]
): HierarchicalGroupItem[] {
  if (!groupingLevels?.ChampsPremierGroupePlanningVue) {
    // Pas de grouping défini, retourner une liste plate d'employés
    return employees.map(emp => ({
      id: emp.IdPersonnel,
      name: emp.Nom,
      level: 0,
      employees: [emp],
      data: emp
    }));
  }

  const { ChampsPremierGroupePlanningVue: level1, ChampsDeuxiemeGroupePlanningVue: level2 } = groupingLevels;

  // Cas 1: Un seul niveau de grouping
  if (!level2 || level1 === level2) {
    return getItemsByLevel(level1, employees, groups).map(item => ({
      ...item,
      level: 1
    }));
  }

  // Cas 2: Deux niveaux de grouping (level1 !== level2)
  const level1Items = getItemsByLevel(level1, employees, groups);
  
  return level1Items.map(level1Item => {
    // Filtrer les employés appartenant à ce groupe de niveau 1
    const level1Employees = filterEmployeesByLevel(employees, level1, level1Item.id);
    
    // Obtenir les sous-groupes de niveau 2
    const level2Items = getItemsByLevel(level2, level1Employees, groups);
    
    return {
      ...level1Item,
      level: 1,
      children: level2Items.map(level2Item => ({
        ...level2Item,
        level: 2
      }))
    };
  });
}

// Fonction auxiliaire pour obtenir les items selon le type de grouping
function getItemsByLevel(
  levelType: GroupingLevel,
  employees: User[],
  groups: Groupe[]
): HierarchicalGroupItem[] {
  if (levelType === 'pole') {
    const poles = Array.from(new Set(employees.map(emp => emp.PoleActivite?.Nom).filter((p): p is string => p !== undefined)));
    return poles.map(pole => {
      const poleEmployees = employees.filter(emp => emp.PoleActivite?.Nom === pole);
      return {
        id: pole || 'Sans Pôle',
        name: pole || 'Sans Pôle',
        level: 0, // Sera écrasé par l'appelant
        employees: poleEmployees,
        data: { pole }
      };
    });
  } else if (levelType === 'equipe') {
    return groups.map(group => {
      const groupEmployees = employees.filter(emp => emp.Equipe?.Id === group.Id);
      return {
        id: group.Id || 'Sans Équipe',
        name: group.Nom || 'Sans Équipe',
        level: 0, // Sera écrasé par l'appelant
        employees: groupEmployees,
        data: group 
      };
    });
  }
  return [];
}

// Fonction auxiliaire pour filtrer les employés selon un niveau
function filterEmployeesByLevel(
  employees: User[],
  levelType: GroupingLevel,
  levelId: string | number
): User[] {
  if (levelType === 'pole') {
    return employees.filter(emp => emp.PoleActivite?.Nom === levelId);
  } else if (levelType === 'equipe') {
    return employees.filter(emp => emp.Equipe?.Id === levelId);
  }
  return [];
}

// Fonction pour regrouper les employés hiérarchiquement
export function groupEmployeesHierarchically(
  employees: User[],
  groupingLevels: GroupingLevels | undefined,
  groups: Groupe[]
): { [key: string]: User[] } {
  const result: { [key: string]: User[] } = {};
  
  if (!groupingLevels?.ChampsPremierGroupePlanningVue) {
    // Pas de grouping, retourner les employés individuellement
    employees.forEach(emp => {
      result[emp.IdPersonnel] = [emp];
    });
    return result;
  }

  const hierarchicalItems = getHierarchicalDimensionItems(groupingLevels, employees, groups);
  
  
  // Aplatir la hiérarchie pour créer la structure Record
  function flattenHierarchy(items: HierarchicalGroupItem[]) {
    items.forEach(item => {
      if (item.employees && item.employees.length > 0) {
        result[item.id] = item.employees;
      }
      if (item.children) {
        flattenHierarchy(item.children);
      }
    });
  }
  
  flattenHierarchy(hierarchicalItems);
  return result;
}
