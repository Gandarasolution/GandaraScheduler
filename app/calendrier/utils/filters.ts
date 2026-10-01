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
  /**
   * Identifiant UI unique dans toute la hiérarchie.
   * Exemples : "equipe:3", "equipe:3/pole:7",
   *            "equipe:__unassigned__/pole:2".
   */
  id: string | number;

  /** Identifiant métier réel, ou __unassigned__ pour "Sans ...". */
  rawId?: string | number;

  name: string;
  level: number; // 0 = sans groupement, 1 = premier groupe, 2 = second groupe
  children?: HierarchicalGroupItem[];
  employees?: User[];
  data?: any;
}

/**
 * Identifiant synthétique utilisé pour les employés sans équipe / sans pôle.
 */
export const UNASSIGNED_DIMENSION_ID = '__unassigned__';

export function getDimensionItemKey(
  id: string | number | null | undefined
): string | number {
  return id == null ? UNASSIGNED_DIMENSION_ID : id;
}

/**
 * Normalise les IDs pour comparer proprement 3, "3", "03", etc.
 */
function normalizeDimensionId(value: unknown): string | null {
  if (value == null) return null;

  const stringValue = String(value).trim();
  if (stringValue === '') return null;

  const numericValue = Number(stringValue);

  return Number.isFinite(numericValue)
    ? String(numericValue)
    : stringValue;
}

function sameDimensionId(a: unknown, b: unknown): boolean {
  const normalizedA = normalizeDimensionId(a);
  const normalizedB = normalizeDimensionId(b);

  return (
    normalizedA !== null &&
    normalizedB !== null &&
    normalizedA === normalizedB
  );
}

/**
 * Renvoie l'ensemble des IDs réellement existants pour une dimension.
 */
function getExistingDimensionIds(
  levelType: GroupingLevel,
  groups: Record<number, Equipe>,
  poleActivites: Record<number, PoleActivite>
): Set<string> {
  const values = levelType === 'pole'
    ? Object.values(poleActivites)
    : Object.values(groups);

  return new Set(
    values
      .map(item => normalizeDimensionId(item.Id))
      .filter((id): id is string => id !== null)
  );
}

/**
 * Un employé est "Sans ..." si :
 * - la valeur est null / undefined / vide ;
 * - ou l'ID renseigné ne correspond plus à aucun groupe existant.
 *
 * Ainsi un ancien IdEquipe supprimé de la table des équipes est aussi rangé
 * dans "Sans Équipe" au lieu de disparaître du planning.
 */
function isUnassignedDimensionValue(
  value: unknown,
  existingIds: Set<string>
): boolean {
  const normalized = normalizeDimensionId(value);
  return normalized === null || !existingIds.has(normalized);
}

/**
 * Construit une clé unique en conservant le chemin hiérarchique.
 * Exemple : equipe:2/pole:5
 */
function buildDimensionId(
  levelType: GroupingLevel,
  rawId: string | number,
  parentId?: string | number
): string {
  const ownId = `${levelType}:${String(rawId)}`;
  return parentId == null ? ownId : `${String(parentId)}/${ownId}`;
}

// Fonction pour obtenir les éléments de dimension avec hiérarchie
export function getHierarchicalDimensionItems(
  groupingLevels: GroupingLevels | undefined,
  employees: User[],
  groups: Record<number, Equipe>,
  poleActivites: Record<number, PoleActivite>
): HierarchicalGroupItem[] {
  if (!groupingLevels?.ChampsPremierGroupePlanningVue) {
    // Pas de grouping défini : liste plate d'employés.
    return employees.map(emp => ({
      id: emp.IdPersonnel,
      rawId: emp.IdPersonnel,
      name: emp.Nom,
      level: 0,
      employees: [emp],
      data: emp
    }));
  }

  const {
    ChampsPremierGroupePlanningVue: level1,
    ChampsDeuxiemeGroupePlanningVue: level2
  } = groupingLevels;

  // Cas 1 : un seul niveau de grouping
  if (!level2 || level1 === level2) {
    return getItemsByLevel(
      level1,
      employees,
      groups,
      poleActivites
    ).map(item => ({
      ...item,
      level: 1
    }));
  }

  // Cas 2 : deux niveaux de grouping
  const level1Items = getItemsByLevel(
    level1,
    employees,
    groups,
    poleActivites
  );

  return level1Items.map(level1Item => {
    const level1RawId = level1Item.rawId ?? level1Item.id;

    // Fonctionne également pour rawId === __unassigned__.
    const level1Employees = filterEmployeesByLevel(
      employees,
      level1,
      level1RawId,
      groups,
      poleActivites
    );

    // Les IDs du niveau 2 incluent le chemin du parent : aucune collision.
    const level2Items = getItemsByLevel(
      level2,
      level1Employees,
      groups,
      poleActivites,
      level1Item.id
    );

    const children: HierarchicalGroupItem[] = level2Items.map(level2Item => ({
      ...level2Item,
      level: 2
    }));

    return {
      ...level1Item,
      level: 1,

      // Important : même si la virtualisation ne lit que item.employees,
      // les employés restent ordonnés selon le groupe de niveau 2.
      employees: children.flatMap(child => child.employees ?? []),
      children
    };
  });
}

/**
 * Retourne les groupes d'un niveau + un groupe synthétique "Sans ..."
 * lorsqu'au moins un employé n'est affecté à aucun élément existant.
 */
function getItemsByLevel(
  levelType: GroupingLevel,
  employees: User[],
  groups: Record<number, Equipe>,
  poleActivites: Record<number, PoleActivite>,
  parentId?: string | number
): HierarchicalGroupItem[] {
  const result: HierarchicalGroupItem[] = [];

  if (levelType === 'pole') {
    Object.values(poleActivites).forEach(pole => {
      const poleEmployees = employees.filter(emp =>
        sameDimensionId(emp.PoleActivite, pole.Id)
      );

      if (poleEmployees.length > 0) {
        result.push({
          id: buildDimensionId('pole', pole.Id, parentId),
          rawId: pole.Id,
          name: pole.Nom || 'Pôle sans nom',
          level: 0,
          employees: poleEmployees,
          data: { pole }
        });
      }
    });

    const existingPoleIds = getExistingDimensionIds(
      'pole',
      groups,
      poleActivites
    );

    const unassignedEmployees = employees.filter(emp =>
      isUnassignedDimensionValue(emp.PoleActivite, existingPoleIds)
    );

    // Toujours ajouté en dernier pour conserver les vrais pôles en premier.
    if (unassignedEmployees.length > 0) {
      result.push({
        id: buildDimensionId(
          'pole',
          UNASSIGNED_DIMENSION_ID,
          parentId
        ),
        rawId: UNASSIGNED_DIMENSION_ID,
        name: 'Sans Pôle',
        level: 0,
        employees: unassignedEmployees,
        data: {
          pole: null,
          unassigned: true
        }
      });
    }

    return result;
  }

  if (levelType === 'equipe') {
    Object.values(groups).forEach(group => {
      const groupEmployees = employees.filter(emp =>
        sameDimensionId(emp.Equipe, group.Id)
      );

      if (groupEmployees.length > 0) {
        result.push({
          id: buildDimensionId('equipe', group.Id, parentId),
          rawId: group.Id,
          name: group.Nom || 'Équipe sans nom',
          level: 0,
          employees: groupEmployees,
          data: group
        });
      }
    });

    const existingTeamIds = getExistingDimensionIds(
      'equipe',
      groups,
      poleActivites
    );

    const unassignedEmployees = employees.filter(emp =>
      isUnassignedDimensionValue(emp.Equipe, existingTeamIds)
    );

    // Toujours ajouté en dernier pour conserver les vraies équipes en premier.
    if (unassignedEmployees.length > 0) {
      result.push({
        id: buildDimensionId(
          'equipe',
          UNASSIGNED_DIMENSION_ID,
          parentId
        ),
        rawId: UNASSIGNED_DIMENSION_ID,
        name: 'Sans Équipe',
        level: 0,
        employees: unassignedEmployees,
        data: {
          group: null,
          unassigned: true
        }
      });
    }

    return result;
  }

  return result;
}

/**
 * Filtre les employés appartenant à un groupe donné.
 * Comprend également le groupe synthétique __unassigned__.
 */
function filterEmployeesByLevel(
  employees: User[],
  levelType: GroupingLevel,
  levelId: string | number,
  groups: Record<number, Equipe>,
  poleActivites: Record<number, PoleActivite>
): User[] {
  if (levelType === 'pole') {
    if (levelId === UNASSIGNED_DIMENSION_ID) {
      const existingPoleIds = getExistingDimensionIds(
        'pole',
        groups,
        poleActivites
      );

      return employees.filter(emp =>
        isUnassignedDimensionValue(emp.PoleActivite, existingPoleIds)
      );
    }

    return employees.filter(emp =>
      sameDimensionId(emp.PoleActivite, levelId)
    );
  }

  if (levelType === 'equipe') {
    if (levelId === UNASSIGNED_DIMENSION_ID) {
      const existingTeamIds = getExistingDimensionIds(
        'equipe',
        groups,
        poleActivites
      );

      return employees.filter(emp =>
        isUnassignedDimensionValue(emp.Equipe, existingTeamIds)
      );
    }

    return employees.filter(emp =>
      sameDimensionId(emp.Equipe, levelId)
    );
  }

  return [];
}

// Fonction pour regrouper les employés hiérarchiquement
export function groupEmployeesHierarchically(
  employees: User[],
  groupingLevels: GroupingLevels | undefined,
  groups: Record<number, Equipe>,
  poleActivites: Record<number, PoleActivite>
): Record<string, User[]> {
  const result: Record<string, User[]> = {};

  if (!groupingLevels?.ChampsPremierGroupePlanningVue) {
    employees.forEach(emp => {
      result[String(emp.IdPersonnel)] = [emp];
    });

    return result;
  }

  const hierarchicalItems = getHierarchicalDimensionItems(
    groupingLevels,
    employees,
    groups,
    poleActivites
  );

  // Aplatit la hiérarchie sans perdre les clés uniques des sous-groupes.
  function flattenHierarchy(items: HierarchicalGroupItem[]) {
    items.forEach(item => {
      if (item.employees && item.employees.length > 0) {
        result[String(item.id)] = item.employees;
      }

      if (item.children?.length) {
        flattenHierarchy(item.children);
      }
    });
  }

  flattenHierarchy(hierarchicalItems);
  return result;
}
