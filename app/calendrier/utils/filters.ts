import { User, Appointment, Filter, DimensionItem, Equipe, GroupingLevel, GroupingLevels, Item, PoleActivite } from '../types';

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
  groups: Record<number, Equipe>,
  poleActivites: Record<number, PoleActivite>
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
    return getItemsByLevel(level1, employees, groups, poleActivites).map(item => ({
      ...item,
      level: 1
    }));
    
  }

  // Cas 2: Deux niveaux de grouping (level1 !== level2)
  const level1Items = getItemsByLevel(level1, employees, groups, poleActivites);
  
  return level1Items.map(level1Item => {
    // Filtrer les employés appartenant à ce groupe de niveau 1
    const level1Employees = filterEmployeesByLevel(employees, level1, level1Item.id);
    
    // Obtenir les sous-groupes de niveau 2
    const level2Items = getItemsByLevel(level2, level1Employees, groups, poleActivites);
    
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
  groups: Record<number, Equipe>,
  poleActivites: Record<number, PoleActivite>
): HierarchicalGroupItem[] {  
  if (levelType === 'pole') {
    return Object.values(poleActivites).reduce((acc, pole) => {
      const poleEmployees = employees.filter(emp => Number(emp.PoleActivite) === Number(pole.Id) && emp.Actif !== false);
      
      // On n'ajoute au tableau final (acc) QUE si on a des employés
      if (poleEmployees.length > 0) {
        acc.push({
          id: pole.Id,
          name: pole.Nom || 'Sans Pôle',
          level: 0,
          employees: poleEmployees,
          data: { pole }
        });
      }
      
      return acc;
    }, [] as HierarchicalGroupItem[]);
  } else if (levelType === 'equipe') {
    return Object.values(groups).reduce((acc, group) => {
      const groupEmployees = employees.filter(emp => Number(emp.Equipe) === Number(group.Id) && emp.Actif !== false);
      if (groupEmployees.length > 0) {
        acc.push({
          id: group.Id,
          name: group.Nom || 'Sans Équipe',
          level: 0,
          employees: groupEmployees,
          data: group
        });
      }
      return acc;
    }, [] as HierarchicalGroupItem[]);
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
    return employees.filter(emp => Number(emp.PoleActivite) === Number(levelId) && emp.Actif !== false);
  } else if (levelType === 'equipe') {
    return employees.filter(emp => Number(emp.Equipe) === Number(levelId) && emp.Actif !== false);
  }
  return [];
}

// Fonction pour regrouper les employés hiérarchiquement
export function groupEmployeesHierarchically(
  employees: User[],
  groupingLevels: GroupingLevels | undefined,
  groups: Record<number, Equipe>,
  poleActivites: Record<number, PoleActivite>
): { [key: string]: User[] } {
  const result: { [key: string]: User[] } = {};
  
  if (!groupingLevels?.ChampsPremierGroupePlanningVue) {
    // Pas de grouping, retourner les employés individuellement
    employees.forEach(emp => {
      result[emp.IdPersonnel] = [emp];
    });
    return result;
  }

  const hierarchicalItems = getHierarchicalDimensionItems(groupingLevels, employees, groups, poleActivites);
  
  
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
