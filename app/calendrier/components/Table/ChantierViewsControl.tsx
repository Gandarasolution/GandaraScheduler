"use client";

import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  Globe2,
  GripVertical,
  Loader2,
  Lock,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

import Modal from "../modals/Modal";
import CustomSelectWithImage from "../ui/CustomSelectWithImage";
import Combobox from "../ui/Combobox";
import type {
  ActiveFilters,
  FilterOption,
  FilterType,
} from "../../utils/searchAndFilterUtils";
import type { CategoryStructure } from "./DataTableFrame";
import calendarConfigService from "@/app/service/calendarConfig.service";
import ressourceService from "@/app/service/ressource.service";

export type ChantierView = {
  id: string;
  sourceViewId?: string;
  name: string;
  isPrivate: boolean;
  isLocked: boolean;
  columns: string[];
  filters: ActiveFilters;
  isEphemeral?: boolean;
};

export type ChantierViewsControlProps = {
  structure: CategoryStructure[];
  keyOfFilter: Record<
    string,
    {
      label: string;
      type: FilterType;
      badgeColors?: Record<string, string>;
    }
  >;
  activeFilters: ActiveFilters;
  userId?: number;
  planningId: number;
  initialViews: ChantierView[];
  initialViewId: string | null;
  onViewChange: (view: ChantierView | null) => void;
  compact?: boolean;
};

type ApiView = Record<string, any>;

type ViewUser = {
  Id: number;
  Nom: string;
  Prenom?: string;
};

interface GroupIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

const GroupIcon: React.FC<GroupIconProps> = ({
  size = 24,
  color = 'currentColor',
  ...props
}) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-group preview-icon">
      <path d="M17 21v-1a2 2 0 00-2-2H9a2 2 0 00-2 2v1"/>
      <path d="M19 10h1a2 2 0 012 2v1"/>
      <path d="M5 10H4a2 2 0 00-2 2v1"/>
      <circle cx="12" cy="11" r="3"/>
      <circle cx="18" cy="4" r="2"/>
      <circle cx="6" cy="4" r="2"/>
    </svg>
  );
};

const cleanFilters = (
  filters: ActiveFilters = {}
): ActiveFilters =>
  Object.fromEntries(
    Object.entries(filters).filter(
      ([, values]) => Array.isArray(values) && values.length > 0
    )
  );

const normalizeFilters = (details: ApiView): ActiveFilters => {
  const source =
    details.activeFilters ??
    details.ActiveFilters ??
    details.filtres ??
    details.Filtres;

  if (source && typeof source === "object" && !Array.isArray(source)) {
    return cleanFilters(source);
  }

  const result: ActiveFilters = {};
  const filters = details.filtrePerso ?? details.FiltrePerso ?? [];

  if (!Array.isArray(filters)) return result;

  for (const filter of filters) {
    const key =
      filter.CodeFiltre ??
      filter.Code ??
      filter.code ??
      filter.IdFiltre;

    const values = filter.Valeurs ?? filter.Valeur ?? [];

    const selected = Array.isArray(values)
      ? values
          .filter(
            (value: any) =>
              value.Selection === 1 || value.selected
          )
          .map((value: any) =>
            String(
              value.Id ??
                value.id ??
                value.Value ??
                value.value
            )
          )
      : [];

    if (key && selected.length) {
      result[String(key)] = selected;
    }
  }

  return result;
};

const columnCodeToId: Record<string, string> = {
  Image: "IG.Image",
  Pole: "IG.PoleActivite",
  "IG.Pole": "IG.PoleActivite",
  DateOS: "IG.DateOS",
  DateFin: "IG.DateFin",
  Code: "IG.CodePlanningRessource",
  "IG.Code": "IG.CodePlanningRessource",
  Identifiant: "IG.Identifiant",
  Libelle: "IG.LibellePlanningRessource",
  "IG.Libelle": "IG.LibellePlanningRessource",
  Etat: "IG.Etat",
  ChargeAffaire: "IG.ChargeAffaire",
  ChefChantier: "IG.ChefChantier",
  TM: "AC.TM",
  HR: "AC.HR",
  SH: "AC.SH",
  DPF: "AC.DPF",
  RPF: "AC.RPF",
  AP: "AC.AP",
  SP: "AC.SP",
};

const columnIdToApiCode: Record<string, string> = {
  "IG.Image": "IG.Image",
  "IG.PoleActivite": "IG.Pole",
  "IG.DateOS": "IG.DateOS",
  "IG.DateFin": "IG.DateFin",
  "IG.CodePlanningRessource": "IG.Code",
  "IG.Identifiant": "IG.Identifiant",
  "IG.LibellePlanningRessource": "IG.Libelle",
  "IG.Etat": "IG.Etat",
  "IG.ChargeAffaire": "IG.ChargeAffaire",
  "IG.ChefChantier": "IG.ChefChantier",
  "AC.TM": "AC.TM",
  "AC.HR": "AC.HR",
  "AC.SH": "AC.SH",
  "AC.DPF": "AC.DPF",
  "AC.RPF": "AC.RPF",
  "AC.AP": "AC.AP",
  "AC.SP": "AC.SP",
};

const normalizeColumn = (column: any): string | null => {
  const code =
    typeof column === "string"
      ? column
      : column?.code ?? column?.Code ?? column?.id ?? column?.Id;

  if (!code) return null;

  return columnCodeToId[code] ?? String(code);
};

const toApiColumnCode = (id: string): string =>
  columnIdToApiCode[id] ?? id;

export const normalizeChantierView = (
  item: ApiView
): ChantierView => {
  const planningVue =
    item.planningVue ?? item.PlanningVue ?? item.planningChantierVue ?? item;

  const rawColumns =
    planningVue.ChantierColonnes ??
    planningVue.chantierColonnes ??
    planningVue.Columns ??
    planningVue.columns ??
    planningVue.colonnes;

  const columns = Array.isArray(rawColumns)
    ? rawColumns.map(normalizeColumn).filter(Boolean) as string[]
    : [];

  const users =
    item.utilisateursAutorises ??
    item.UtilisateursAutorises ??
    planningVue.utilisateursAutorises ??
    [];

  const rawId =
    planningVue.IdPlanningChantierVue ??
    planningVue.id ??
    planningVue.IdPlanningVue ??
    item.IdPlanningVue;

  return {
    id: rawId == null ? "" : String(rawId),
    name:
      planningVue.LibellePlanningVue ??
      planningVue.libelle ??
      planningVue.name ??
      "Vue sans nom",
    isPrivate:
      (Array.isArray(users) && users.length > 0) ||
      Boolean(planningVue.isPrivate),
    isLocked: Boolean(planningVue.isLocked),
    columns,
    filters: normalizeFilters(planningVue),
  };
};

export const extractLastChantierViewId = (
  response: ApiView | null | undefined
): string | null => {
  if (!response || response.success === false) return null;

  const payload = response.data ?? response;
  const candidate = Array.isArray(payload)
    ? payload[0]
    : payload;

  if (!candidate || typeof candidate !== "object") return null;

  const id =
    candidate.IdPlanningChantierVue ??
    candidate.idPlanningChantierVue ??
    candidate.IdPlanningVue ??
    candidate.idPlanningVue ??
    candidate.ValeurParametre ??
    candidate.valeurParametre;

  return id == null || id === "" ? null : String(id);
};

const Skeleton = memo(function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-secondary-bg ${className}`}
    />
  );
});

const LoadingMessage = memo(function LoadingMessage({
  message,
}: {
  message: string;
}) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 rounded-xl border border-default bg-secondary-bg px-4 py-5 text-sm text-secondary"
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      {message}
    </div>
  );
});

const ChantierViewsControl: React.FC<
  ChantierViewsControlProps
> = ({
  structure,
  keyOfFilter,
  activeFilters,
  userId,
  planningId,
  initialViews,
  initialViewId,
  onViewChange,
  compact = false,
}) => {
  
  const [detailsLoaded, setDetailsLoaded] = useState(false);

  // 1. Stockage en ref des colonnes disponibles renvoyées par l'API
  const availableApiColumnsRef = useRef<string[] | null>(null);

  // Mappage global de la structure reçue en props
  const globalColumnsMap = useMemo(() => {
    const map = new Map<string, { id: string; apiCode: string; label: string; categoryLabel: string }>();
    structure.forEach((category) => {
      category.attributes.forEach((attribute) => {
        const id = `${category.key}.${attribute.key}`;
        map.set(id, {
          id,
          apiCode: toApiColumnCode(id),
          label: attribute.label || attribute.key,
          categoryLabel: category.label,
        });
      });
    });
    return map;
  }, [structure]);

  // Si l'API nous renvoie une liste spécifique, on ne garde que celles qui existent dans l'API,
  // sinon on se rabat sur l'ensemble de la structure.
  const allColumns = useMemo(() => {
    if (availableApiColumnsRef.current && availableApiColumnsRef.current.length > 0) {
      return availableApiColumnsRef.current
        .map((colId) => globalColumnsMap.get(colId))
        .filter(Boolean) as Array<{ id: string; apiCode: string; label: string; categoryLabel: string }>;
    }
    return Array.from(globalColumnsMap.values());
  }, [globalColumnsMap, detailsLoaded]); // réévalué dès que detailsLoaded bascule à true

  const columnsById = useMemo(
    () => new Map(allColumns.map((column) => [column.id, column])),
    [allColumns]
  );

  const defaultColumns = useMemo(
    () => allColumns.map((column) => column.id),
    [allColumns]
  );

  const filterKeys = useMemo(
    () => Object.keys(keyOfFilter).sort(),
    [keyOfFilter]
  );

  const filterKeysSignature = filterKeys.join("|");

  const initialViewsSignature = useMemo(
    () =>
      initialViews
        .map(
          (view) =>
            `${view.id}:${view.name}:${view.columns.join(",")}:${JSON.stringify(view.filters)}`
        )
        .join("|"),
    [initialViews]
  );

  const [views, setViews] = useState<ChantierView[]>(initialViews);
  const [selectedId, setSelectedId] = useState(
    initialViewId ?? initialViews[0]?.id ?? ""
  );
  const [columns, setColumns] = useState<string[]>(defaultColumns);
  const [filterDraft, setFilterDraft] = useState<ActiveFilters>({});
  const [name, setName] = useState("");
  const [editingView, setEditingView] =
    useState<ChantierView | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ViewUser[]>([]);
  const [filterOptions, setFilterOptions] =
    useState<Record<string, FilterOption[]>>({});
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] =
    useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] =
    useState<string | null>(null);
  const [activeFilterKey, setActiveFilterKey] =
    useState<string | null>(null);
  const [deletingViewId, setDeletingViewId] =
    useState<string | null>(null);

  const columnElementsRef = useRef(
    new Map<string, HTMLDivElement>()
  );
  const columnRefCallbacks = useRef(
    new Map<string, (element: HTMLDivElement | null) => void>()
  );
  const previousColumnRectsRef = useRef(
    new Map<string, DOMRect>()
  );
  const draggedColumnRef = useRef<string | null>(null);
  const activeFiltersRef = useRef(activeFilters);
  const initialViewIdRef = useRef(initialViewId);

  useEffect(() => {
    activeFiltersRef.current = activeFilters;
  }, [activeFilters]);

  useEffect(() => {
    initialViewIdRef.current = initialViewId;
  }, [initialViewId]);

  const persistLastChantierView = useCallback(
    async (view: ChantierView) => {
      const id = Number(view.sourceViewId ?? view.id);
      if (!Number.isInteger(id) || id <= 0) return;

      try {
        const response =
          await calendarConfigService.setLastChantierView(id);

        if (response?.success === false) {
          throw new Error(
            "Impossible d'enregistrer la dernière vue sélectionnée."
          );
        }
      } catch (reason) {
        console.error(
          "Erreur lors de la mémorisation de la vue :",
          reason
        );
      }
    },
    []
  );

  const selectView = useCallback(
    (view: ChantierView) => {
      setSelectedId(view.id);
      setColumns(
        view.columns.length ? view.columns : defaultColumns
      );
      setError(null);
      onViewChange(view);
      void persistLastChantierView(view);
    },
    [defaultColumns, onViewChange, persistLastChantierView]
  );

  useEffect(() => {
    setViews(initialViews);

    const initialView =
      initialViews.find((view) => view.id === initialViewId) ??
      initialViews[0];

    if (!initialView) {
      setSelectedId("");
      return;
    }

    setSelectedId(initialView.id);
    setColumns(
      initialView.columns.length
        ? initialView.columns
        : defaultColumns
    );
  }, [
    initialViewsSignature,
    initialViewId,
    defaultColumns,
  ]);

  const selectedView = useMemo(
    () => views.find((view) => view.id === selectedId),
    [views, selectedId]
  );

  const hasFilters = useMemo(
    () => Object.keys(cleanFilters(activeFilters)).length > 0,
    [activeFilters]
  );

  useEffect(() => {
    if (
      !selectedView?.isEphemeral ||
      selectedView.id === initialViewId ||
      hasFilters
    ) {
      return;
    }

    const fallback = views.find((view) => !view.isEphemeral);
    if (!fallback) return;

    setSelectedId(fallback.id);
    setColumns(
      fallback.columns.length ? fallback.columns : defaultColumns
    );
    onViewChange(fallback);
  }, [
    selectedView,
    initialViewId,
    hasFilters,
    views,
    defaultColumns,
    onViewChange,
  ]);

  const getColumnRef = useCallback((id: string) => {
    const cached = columnRefCallbacks.current.get(id);
    if (cached) return cached;

    const callback = (element: HTMLDivElement | null) => {
      if (element) {
        columnElementsRef.current.set(id, element);
      } else {
        columnElementsRef.current.delete(id);
      }
    };

    columnRefCallbacks.current.set(id, callback);
    return callback;
  }, []);

  useLayoutEffect(() => {
    const previousRects = previousColumnRectsRef.current;

    columnElementsRef.current.forEach((element, id) => {
      if (id === draggedColumnRef.current) return;

      const previous = previousRects.get(id);
      if (!previous) return;

      const current = element.getBoundingClientRect();
      const deltaX = previous.left - current.left;
      const deltaY = previous.top - current.top;

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

      element.style.transition = "none";
      element.style.transform =
        `translate(${deltaX}px, ${deltaY}px)`;

      void element.offsetHeight;

      element.style.transition =
        "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)";
      element.style.transform = "";

      const handleTransitionEnd = (event: TransitionEvent) => {
        if (event.propertyName !== "transform") return;
        element.style.transition = "";
        element.removeEventListener(
          "transitionend",
          handleTransitionEnd
        );
      };

      element.addEventListener(
        "transitionend",
        handleTransitionEnd
      );
    });

    return () => {
      const rects = new Map<string, DOMRect>();

      columnElementsRef.current.forEach((element, id) => {
        rects.set(id, element.getBoundingClientRect());
      });

      previousColumnRectsRef.current = rects;
    };
  }, [columns]);

  const openEditor = useCallback(
    (view?: ChantierView) => {
      
      const editableView =
        view && !view.isEphemeral ? view : null;

        
      setEditingView(editableView);
      setName(
        view?.name === "Vue éphémère" ? "" : view?.name ?? ""
      );
      setIsPrivate(view?.isPrivate ?? false);
      setSelectedUsers([]);
      setFilterDraft(view?.filters ?? {});
      setActiveFilterKey(null);
      setError(null);
      setOptionsLoaded(false);
      setDetailsLoaded(false);
      setIsEditorOpen(true);
    },
    []
  );

  // 2. Chargement des utilisateurs et filtres
  useEffect(() => {
    if (!isEditorOpen) return;

    let cancelled = false;

    setIsLoadingOptions(true);
    setOptionsLoaded(false);

    Promise.all([
      calendarConfigService.getAllUsersForVue(),
      ressourceService.getFilterOptionsDynamic(
        "chantier-table",
        filterKeys
      ),
    ])
      .then(([usersResponse, filtersResponse]) => {
        if (cancelled) return;

        const rawUsers = usersResponse?.data ?? usersResponse ?? [];

        setAvailableUsers(
          Array.isArray(rawUsers)
            ? rawUsers
                .map((user: any) => ({
                  Id: Number(user.Id ?? user.IdPersonnel),
                  Nom: user.Nom ?? user.name ?? "",
                  Prenom: user.Prenom ?? user.firstName,
                }))
                .filter((user: ViewUser) => user.Id > 0)
            : []
        );

        const payload =
          filtersResponse?.data?.filters ??
          filtersResponse?.data?.Filters ??
          filtersResponse?.data?.filtres ??
          filtersResponse?.data?.Filtres ??
          filtersResponse?.data ??
          {};

        const normalized: Record<string, FilterOption[]> = {};

        if (payload && typeof payload === "object") {
          for (const [key, rawOptions] of Object.entries(payload)) {
            normalized[key] = Array.isArray(rawOptions)
              ? rawOptions
                  .map((option: any) =>
                    typeof option === "string"
                      ? { value: option, label: option }
                      : {
                          value: String(
                            option.value ?? option.Id ?? option.id ?? ""
                          ),
                          label:
                            option.label ??
                            option.Nom ??
                            option.name ??
                            String(option.value ?? option.Id ?? ""),
                        }
                  )
                  .filter((option) => option.value)
              : [];
          }
        }

        setFilterOptions(normalized);
        setOptionsLoaded(true);
      })
      .catch((reason) => {
        if (cancelled) return;
        console.error("Erreur de chargement des options :", reason);
        setError(
          "Impossible de charger les utilisateurs ou les filtres."
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEditorOpen, filterKeysSignature]);


  // 3. Appel de l'API des colonnes disponibles + chargement des détails lors de l'ouverture de la modale
 useEffect(() => {
    if (!isEditorOpen) return;

    let cancelled = false;
    const viewId = editingView ? Number(editingView.id) : 0;

    setIsLoadingDetails(true);
    setDetailsLoaded(false);

    // En mode Création, force l'état `columns` à vide immédiatement
    if (!editingView) {
      setColumns([]);
      setFilterDraft({});
    }

    Promise.all([
      editingView
        ? calendarConfigService.getChantierViewDetails(viewId, "chantier-table")
        : Promise.resolve(null),
      calendarConfigService.getAvailableColumns
        ? calendarConfigService.getAvailableColumns("chantier-table")
        : Promise.resolve(null),
    ])
      .then(([viewDetailsResponse, columnsResponse]) => {
        if (cancelled) return;

        // Stockage dans la ref des colonnes disponibles
        if (columnsResponse) {
          const rawApiColumns = columnsResponse?.data ?? columnsResponse;
          if (Array.isArray(rawApiColumns)) {
            availableApiColumnsRef.current = rawApiColumns
              .map(normalizeColumn)
              .filter(Boolean) as string[];
          }
        }

        const availableIds = availableApiColumnsRef.current ?? Array.from(globalColumnsMap.keys());

        if (editingView && viewDetailsResponse) {
          if (viewDetailsResponse?.success === false) {
            throw new Error(
              viewDetailsResponse.message ??
                "Impossible de charger les données de la vue."
            );
          }

          const payload = viewDetailsResponse?.data ?? viewDetailsResponse;
          const details = normalizeChantierView(payload);

          // Filtrage strict : on garde les colonnes enregistrées qui existent dans l'API
          const validSelectedColumns = details.columns.filter((col) =>
            availableIds.includes(col)
          );

          // Ne remplace PAS par `availableIds` si le tableau est vide !
          setColumns(validSelectedColumns);

          if (details.name !== "Vue sans nom") {
            setName(details.name);
          }

          setFilterDraft(details.filters);

          const planningVue =
            payload?.planningVue ?? payload?.PlanningVue ?? payload;
          const users =
            payload?.utilisateursAutorises ??
            payload?.UtilisateursAutorises ??
            planningVue?.utilisateursAutorises ??
            [];

          const userIds = Array.isArray(users)
            ? users
                .map((user: any) =>
                  Number(user?.Id ?? user?.IdPersonnel ?? user)
                )
                .filter((id: number) => Number.isFinite(id) && id > 0)
            : [];

          setIsPrivate(userIds.length > 0);
          setSelectedUsers(userIds);
        } else {
          // En mode Création, on s'assure impérativement d'avoir un tableau vide
          setColumns([]);
        }

        setDetailsLoaded(true);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;

        const message =
          reason instanceof Error
            ? reason.message
            : "Impossible de charger les données de la vue.";

        setError(message);
        console.error(message, reason);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEditorOpen, editingView, globalColumnsMap]);

  useEffect(() => {
    console.log(columns, "columns");
  }, [columns]);


  // Colonnes non encore sélectionnées dans le formulaire
  const availableColumns = useMemo(
    () => allColumns.filter((column) => !columns.includes(column.id)),
    [allColumns, columns]
  );

  const availableColumnsByCategory = useMemo(() => {
    const groups = new Map<
      string,
      typeof availableColumns
    >();

    for (const column of availableColumns) {
      const existing = groups.get(column.categoryLabel) ?? [];
      existing.push(column);
      groups.set(column.categoryLabel, existing);
    }

    return Array.from(groups.entries());
  }, [availableColumns]);

  const selectedFilterCount = useMemo(
    () => Object.keys(cleanFilters(filterDraft)).length,
    [filterDraft]
  );

  const filterEntries = useMemo(
    () => Object.entries(keyOfFilter),
    [keyOfFilter]
  );

  const leftFilterEntries = useMemo(
    () => filterEntries.filter((_, index) => index % 2 === 0),
    [filterEntries]
  );

  const rightFilterEntries = useMemo(
    () => filterEntries.filter((_, index) => index % 2 !== 0),
    [filterEntries]
  );

  const isDeletableView = useCallback(
    (view?: ChantierView | null) =>
      Boolean(
        view &&
          !view.isEphemeral && !view.isLocked &&
          Number.isInteger(Number(view.id)) &&
          Number(view.id) > 0
      ),
    []
  );

  const moveColumn = useCallback((target: string) => {
    const source = draggedColumnRef.current;
    if (!source || source === target) return;

    setColumns((current) => {
      const from = current.indexOf(source);
      const to = current.indexOf(target);

      if (from < 0 || to < 0 || from === to) return current;

      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

    setDraggedColumn(null);
    draggedColumnRef.current = null;
  }, []);

  const saveView = useCallback(async () => {
    if (
      !name.trim() ||
      !userId ||
      columns.length === 0 ||
      isLoadingOptions ||
      isLoadingDetails ||
      isSaving
    ) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const filters = cleanFilters(filterDraft);

    try {
      const payload = {
        planningVue: {
          IdPlanningVue: editingView
            ? Number(editingView.id)
            : 0,
          IdPlanning: planningId,
          TypeVue: "chantier-table",
          LibellePlanningVue: name.trim(),
          ChantierColonnes: columns.map(toApiColumnCode),
          DescriptionPlanningVue: "",
          IdPlanningImage: null,
        },
        filtres: filters,
        utilisateursAutorises: isPrivate
          ? Array.from(new Set([userId, ...selectedUsers]))
          : [],
      };

      const response = editingView
        ? await calendarConfigService.updateChantierView(
            Number(editingView.id),
            payload
          )
        : await calendarConfigService.createChantierView(payload);

      if (response?.success === false) {
        throw new Error(
          response.message ?? "Impossible d'enregistrer la vue."
        );
      }

      const saved = normalizeChantierView(
        response?.data ?? response
      );

      const savedId = editingView?.id || saved.id;

      if (
        !savedId ||
        savedId === "undefined" ||
        !Number.isFinite(Number(savedId)) ||
        Number(savedId) <= 0
      ) {
        throw new Error(
          "L'API n'a pas renvoyé l'identifiant de la vue créée."
        );
      }

      const next: ChantierView = {
        ...saved,
        id: savedId,
        name:
          saved.name === "Vue sans nom"
            ? name.trim()
            : saved.name,
        columns: [...columns],
        filters,
        isPrivate,
      };

      setViews((current) =>
        editingView
          ? current.map((view) =>
              view.id === editingView.id ? next : view
            )
          : [...current, next]
      );

      setIsEditorOpen(false);
      setEditingView(null);
      selectView(next);
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Impossible d'enregistrer la vue.";

      setError(message);
      console.error(message, reason);
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    userId,
    columns,
    isLoadingOptions,
    isLoadingDetails,
    isSaving,
    filterDraft,
    editingView,
    planningId,
    isPrivate,
    selectedUsers,
    selectView,
  ]);

  const deleteView = useCallback(
    async (target: ChantierView) => {
      if (!isDeletableView(target) || deletingViewId || target.isLocked) return;

      setDeletingViewId(target.id);
      setError(null);

      try {
        const service = calendarConfigService as Record<string, any>;
        const deleteFn =
          service.deleteChantierVue ??
          service.deletePlanningVue ??
          service.deleteView;

        if (typeof deleteFn !== "function") {
          throw new Error(
            "La méthode de suppression n'est pas disponible sur calendarConfigService."
          );
        }

        const response = await deleteFn.call(
          calendarConfigService,
          Number(target.id)
        );

        if (response?.success === false) {
          throw new Error(
            response.message ?? "Impossible de supprimer la vue."
          );
        }

        const remaining = views.filter(
          (view) => view.id !== target.id
        );

        setViews(remaining);

        if (editingView?.id === target.id) {
          setIsEditorOpen(false);
          setEditingView(null);
        }

        if (selectedId === target.id) {
          const fallback =
            remaining.find((view) => !view.isEphemeral) ??
            remaining[0];

          if (fallback) {
            selectView(fallback);
          } else {
            setSelectedId("");
            setColumns(defaultColumns);
            onViewChange(null);
          }
        }
      } catch (reason) {
        const message =
          reason instanceof Error
            ? reason.message
            : "Impossible de supprimer la vue.";

        setError(message);
        console.error(message, reason);
      } finally {
        setDeletingViewId(null);
      }
    },
    [
      isDeletableView,
      deletingViewId,
      views,
      editingView,
      selectedId,
      selectView,
      defaultColumns,
      onViewChange,
    ]
  );

  const groupCodesByRange = (options: FilterOption[]) => {
    const groups: Record<string, FilterOption[]> = {};

    for (const option of options) {
      const num = parseInt(option.value, 10);
      if (isNaN(num)) {
        const fallbackKey = "Autres";
        groups[fallbackKey] = groups[fallbackKey] || [];
        groups[fallbackKey].push(option);
        continue;
      }

      const thousands = Math.floor(num / 1000) * 1000;
      const groupKey = `${thousands} - ${thousands + 999}`;
      groups[groupKey] = groups[groupKey] || [];
      groups[groupKey].push(option);
    }

    return groups;
  };

  const isEditorLoading =
    isLoadingOptions || isLoadingDetails;

  const renderFilterCard = (
    [key, category]: (typeof filterEntries)[number]
  ) => {

    const options = filterOptions[key] || [];
    const values = filterDraft[key] || [];

    if (key === "etat"){console.log(options, values);}

    const handleFilterChange = (nextValues: string[]) => {
      const normalizedValues =
        category.type === "select" || category.type === "radio"
          ? nextValues.slice(-1)
          : nextValues;

      setFilterDraft((current) => {
        const next = { ...current };

        if (normalizedValues.length > 0) {
          next[key] = normalizedValues;
        } else {
          delete next[key];
        }

        return next;
      });
    };

    const toggleFilter = (categoryKey: string, value: string) => {
      setFilterDraft((prev) => ({
        ...prev,
        [categoryKey]: (prev[categoryKey] || []).includes(value)
          ? (prev[categoryKey] || []).filter((item) => item !== value)
          : [...(prev[categoryKey] || []), value],
      }));
    };

    if (key === "code" || key === "Code") {
      const groupedCodes = groupCodesByRange(options);

      const toggleGroup = (groupOptions: FilterOption[]) => {
        const groupValues = groupOptions.map((opt) => String(opt.value));
        const allSelected = groupValues.every((val) => values.includes(val));

        setFilterDraft((prev) => {
          const currentValues = prev[key] || [];
          let nextValues: string[];

          if (allSelected) {
            // Désélectionner tout le groupe
            nextValues = currentValues.filter((v) => !groupValues.includes(v));
          } else {
            // Ajouter tout le groupe sans doublons
            nextValues = Array.from(new Set([...currentValues, ...groupValues]));
          }

          const next = { ...prev };
          if (nextValues.length > 0) {
            next[key] = nextValues;
          } else {
            delete next[key];
          }
          return next;
        });
      };

      return (
        <div key={key} className="min-w-0 space-y-3 rounded-xl border border-default p-3 bg-primary-bg/50">
          <div className="flex items-center justify-between px-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {category.label} (Par tranche)
            </label>
            {values.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                {values.length} sélectionné(s)
              </span>
            )}
          </div>

          {/* Boutons de sélection rapide par groupe/tranche */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(groupedCodes).map(([groupLabel, groupOptions]) => {
              const groupValues = groupOptions.map((opt) => String(opt.value));
              const selectedCountInGroup = groupValues.filter((v) => values.includes(v)).length;
              const isFullySelected = selectedCountInGroup === groupValues.length && groupValues.length > 0;
              const isPartiallySelected = selectedCountInGroup > 0 && !isFullySelected;

              return (
                <button
                  key={groupLabel}
                  type="button"
                  onClick={() => toggleGroup(groupOptions)}
                  className={`
                    cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${
                      isFullySelected
                        ? "border-primary bg-primary text-white"
                        : isPartiallySelected
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-default bg-secondary-bg/60 text-secondary hover:border-primary/40"
                    }
                  `}
                >
                  <span>Série {groupLabel}</span>
                  <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${isFullySelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                    {selectedCountInGroup}/{groupOptions.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Combobox classique pour affiner au cas par cas si besoin */}
          <Combobox
            options={options.map((option) => ({
              value: String(option.value),
              label: String(option.label),
            }))}
            value={values.map(String)}
            onValueChange={(nextValues) => {
              setFilterDraft((current) => {
                const next = { ...current };
                if (nextValues.length > 0) next[key] = nextValues;
                else delete next[key];
                return next;
              });
            }}
            placeholder="Rechercher ou ajuster un code précis..."
          />
        </div>
      );
    }

    if (key === "etat") {
      return (
        <> 
          <div className="flex items-center justify-between gap-2 px-1 py-0.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {category.label}
            </label>
            {values.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                {values.length}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4" key={key}>
            {options.map((option) => {
              const isSelected = values.includes(option.value) ?? false;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleFilter(key, option.value)}
                  className={`
                    inline-flex items-center px-3 py-1.5 rounded-3xl text-xs font-medium
                    transition-all duration-200 cursor-pointer
                    ${
                      isSelected
                        ? "ring-1 ring-primary ring-offset-2 scale-105"
                        : "opacity-70 hover:opacity-100 hover:scale-105"
                    }
                  `}
                >
                  {option.label}
                  {isSelected && (
                    <svg className="ml-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
        
      );
    }

    return (
      <div key={key} className="min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2 px-1 py-0.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {category.label}
          </label>
          {values.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
              {values.length}
            </span>
          )}
        </div>

        {isEditorLoading ? (
          <Skeleton className="h-10 w-full rounded-xl" />
        ) : (
          <Combobox
            options={options.map((option) => ({
              value: String(option.value),
              label: String(option.label),
            }))}
            value={values.map(String)}
            onValueChange={handleFilterChange}
            placeholder={`Rechercher ${category.label.toLowerCase()}...`}
          />
        )}

        {!isEditorLoading && options.length === 0 && (
          <p className="px-1 py-1 text-xs text-secondary">
            Aucune option disponible.
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={
          compact
            ? "relative flex items-center gap-2"
            : "mb-5 flex items-center justify-between gap-4 px-1 py-2"
        }
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {!compact && (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Globe2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                  Configuration
                </p>
                <p className="max-w-64 truncate text-sm font-semibold text-primary">
                  {hasFilters
                    ? "Vue éphémère"
                    : selectedView?.name ?? "Vue par défaut"}
                </p>
              </div>
            </div>
          )}

          <div className="min-w-[280px]">
            <CustomSelectWithImage
              options={views.map((view) => ({
                id: view.id,
                value: view.id,
                name: view.name,
                isEphemeral: view.isEphemeral,
                icon: view.isEphemeral ? (
                  <Sparkles className="h-4 w-4 text-amber-500" />
                ) : view.isPrivate ? (
                  <Lock className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <GroupIcon className="text-primary"/>
                ),
                badge: view.isPrivate ? "Privée" : undefined,
                canDelete: isDeletableView(view),
              }))}
              value={selectedId}
              disabled={isSaving || deletingViewId !== null}
              onChange={(value) => {
                const view = views.find(
                  (item) => item.id === String(value)
                );
                if (view) selectView(view);
              }}
              onEditOption={(option) => {
                const target = views.find((item) => item.id === String(option.id));
                if (target) openEditor(target);
              }}
              onAddOption={() => openEditor()}
              addOptionLabel="Créer une vue"
              onDeleteOption={(option) => {
                const target = views.find(
                  (item) => item.id === String(option.id)
                );
                if (target && !target.isLocked) void deleteView(target);
              }}
              deletingOptionId={deletingViewId}
              placeholder={
                views.length
                  ? "Sélectionner une vue"
                  : "Aucune vue enregistrée"
              }
              illustrationImage={
                (() => {
                  const view = views.find((item) => item.id === selectedId);
                  if (!view) return null;

                  if (view.isEphemeral) {
                    return <Sparkles className="h-4 w-4 text-amber-500" />;
                  }
                  
                  if (view.isPrivate) {
                    return <Lock className="h-3.5 w-3.5 text-primary" />;
                  }

                  return <GroupIcon className="text-primary" />;
                })()
              }
              className="rounded-xl border-default bg-secondary-bg px-2 py-1.5"
            />
          </div>
        </div>
      </div>

      <Modal
        isOpen={isEditorOpen}
        onClose={() => !isSaving && setIsEditorOpen(false)}
        title={
          editingView
            ? "Modifier la vue du tableau"
            : "Créer une vue du tableau"
        }
        className="w-[98vw] max-w-8xl overflow-hidden"
      >
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <X className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isLoadingDetails && (
              <LoadingMessage message="Chargement des données de la vue..." />
            )}

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">              
              <section className="min-w-0 rounded-2xl border border-default bg-secondary-bg/40 p-4 sm:p-5 xl:col-span-5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    Nom de la vue *
                  </label>
                  <span className="text-xs text-secondary">
                    {name.length}/100
                  </span>
                </div>

                {isLoadingDetails ? (
                  <Skeleton className="mt-3 h-11 w-full" />
                ) : (
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex. Suivi des chantiers en cours"
                    maxLength={100}
                    className="mt-3 w-full rounded-xl border border-default bg-primary-bg px-4 py-3 text-sm text-primary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    autoFocus
                  />
                )}
              </section>

              <section className="min-w-0 rounded-2xl border border-default bg-secondary-bg/40 p-4 sm:p-5 xl:col-span-7">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    Visibilité
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    {isPrivate ? "Accès restreint" : "Accès public"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    disabled={isLoadingDetails}
                    className={`cursor-pointer flex items-center justify-center gap-2 rounded-xl border p-3 text-sm ${
                      !isPrivate
                        ? "border-primary bg-primary text-white"
                        : "border-default bg-primary-bg text-secondary"
                    }`}
                  >
                    <GroupIcon className="h-4 w-4" />
                    Partagée
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    disabled={isLoadingDetails}
                    className={`cursor-pointer flex items-center justify-center gap-2 rounded-xl border p-3 text-sm ${
                      isPrivate
                        ? "border-primary bg-primary text-white"
                        : "border-default bg-primary-bg text-secondary"
                    }`}
                  >
                    <Lock className="h-4 w-4" />
                    Privée
                  </button>
                </div>

                <p className="mt-2 text-xs text-secondary">
                  {isPrivate
                    ? "Seuls vous et les utilisateurs autorisés peuvent accéder à cette vue."
                    : "Tous les utilisateurs autorisés peuvent consulter cette vue."}
                </p>
              </section>
            </div>

            {isPrivate && (
              <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-primary">
                      Utilisateurs autorisés
                    </h3>
                    <p className="text-xs text-secondary">
                      Sélectionnez les collaborateurs autorisés.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">
                    {selectedUsers.length} sélectionné(s)
                  </span>
                </div>

                {isLoadingOptions ? (
                  <Skeleton className="h-10 w-full rounded-xl" />
                ) : (
                  <Combobox
                    options={availableUsers
                      .filter((user) => user.Id !== userId)
                      .map((user) => ({
                        value: String(user.Id),
                        label: `${user.Nom} ${user.Prenom ?? ""} (${user.Id})`.trim(),
                      }))}
                    value={selectedUsers.map(String)}
                    onValueChange={(nextValues) =>
                      setSelectedUsers(nextValues.map(Number))
                    }
                    placeholder="Rechercher un collaborateur..."
                  />
                )}
              </section>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <section className="rounded-2xl border border-default bg-secondary-bg/50 p-4 sm:p-5 lg:col-span-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-primary">
                      Colonnes affichées et ordre
                    </h3>
                    <p className="mt-1 text-xs text-secondary">
                      Glissez les colonnes ou utilisez les flèches.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">
                    {columns.length} colonne(s)
                  </span>
                </div>

                {isLoadingDetails ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
                    <div className="min-w-0 rounded-xl border border-default bg-primary-bg p-3 lg:col-span-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-secondary">
                          Disponibles ({availableColumns.length})
                        </span>
                        {availableColumns.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setColumns((current) => [
                                ...current,
                                ...availableColumns.map((column) => column.id),
                              ])
                            }
                            className="cursor-pointer text-xs font-semibold text-primary"
                          >
                            + Tout
                          </button>
                        )}
                      </div>

                      <div className="max-h-[450px] space-y-4 overflow-y-auto">
                        {availableColumnsByCategory.map(
                          ([categoryLabel, categoryColumns]) => (
                            <div key={categoryLabel}>
                              <p className="mb-2 text-[11px] font-semibold uppercase text-secondary">
                                {categoryLabel}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {categoryColumns.map((column) => (
                                  <button
                                    key={column.id}
                                    type="button"
                                    onClick={() =>
                                      setColumns((current) =>
                                        current.includes(column.id)
                                          ? current
                                          : [...current, column.id]
                                      )
                                    }
                                    className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-dashed border-default px-2 py-1.5 text-xs text-primary hover:border-primary hover:bg-primary/5"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    {column.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        )}

                        {availableColumns.length === 0 && (
                          <p className="py-6 text-center text-xs text-secondary">
                            Toutes les colonnes sont affichées.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 rounded-xl border border-default bg-primary-bg p-3 lg:col-span-7">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-secondary">
                          Ordre d'affichage ({columns.length})
                        </span>
                        {columns.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setColumns([])}
                            className="cursor-pointer text-xs text-secondary hover:text-red-600"
                          >
                            Tout retirer
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {columns.map((id, index) => {
                          const column = columnsById.get(id);
                          if (!column) return null;

                          return (
                            <div
                              key={id}
                              ref={getColumnRef(id)}
                              onDragOver={(event) => {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                                if (draggedColumnRef.current !== id) {
                                  setDragOverColumn(id);
                                }
                              }}
                              onDragLeave={(event) => {
                                if (
                                  !(event.relatedTarget instanceof Node) ||
                                  !event.currentTarget.contains(event.relatedTarget)
                                ) {
                                  setDragOverColumn(null);
                                }
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                moveColumn(id);
                                setDragOverColumn(null);
                              }}
                              className={`flex min-w-0 items-center gap-2 rounded-xl border px-2 py-2 text-sm ${
                                draggedColumn === id
                                  ? "border-primary bg-primary/10 opacity-50"
                                  : dragOverColumn === id
                                    ? "border-primary bg-primary/10"
                                    : "border-default bg-secondary-bg/30"
                              }`}
                            >
                              <button
                                type="button"
                                draggable
                                onDragStart={(event) => {
                                  draggedColumnRef.current = id;
                                  setDraggedColumn(id);
                                  event.dataTransfer.effectAllowed = "move";
                                  event.dataTransfer.setData("text/plain", id);
                                }}
                                onDragEnd={() => {
                                  draggedColumnRef.current = null;
                                  setDraggedColumn(null);
                                  setDragOverColumn(null);
                                }}
                                className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-secondary"
                                aria-label={`Déplacer ${column.label}`}
                              >
                                <GripVertical className="h-4 w-4" />
                              </button>

                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                                {index + 1}
                              </span>

                              <span className="min-w-0 flex-1 truncate font-medium text-primary">
                                {column.label}
                              </span>

                              <span className="hidden shrink-0 rounded-md bg-primary-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary sm:inline-block">
                                {column.categoryLabel}
                              </span>

                              <div className="flex shrink-0 items-center">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() =>
                                    setColumns((current) => {
                                      if (index <= 0) return current;
                                      const next = [...current];
                                      [next[index - 1], next[index]] = [
                                        next[index],
                                        next[index - 1],
                                      ];
                                      return next;
                                    })
                                  }
                                  aria-label={`Monter ${column.label}`}
                                  className="rounded p-1 text-secondary hover:text-primary disabled:opacity-30"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  disabled={index === columns.length - 1}
                                  onClick={() =>
                                    setColumns((current) => {
                                      if (index >= current.length - 1) return current;
                                      const next = [...current];
                                      [next[index], next[index + 1]] = [
                                        next[index + 1],
                                        next[index],
                                      ];
                                      return next;
                                    })
                                  }
                                  aria-label={`Descendre ${column.label}`}
                                  className="rounded p-1 text-secondary hover:text-primary disabled:opacity-30"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setColumns((current) =>
                                      current.filter((item) => item !== id)
                                    )
                                  }
                                  aria-label={`Retirer ${column.label}`}
                                  className="rounded p-1 text-secondary hover:bg-red-50 hover:text-red-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {columns.length === 0 && (
                          <p className="py-8 text-center text-sm text-secondary">
                            Ajoutez au moins une colonne.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-default bg-secondary-bg/50 p-4 sm:p-5 lg:col-span-7">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <SlidersHorizontal className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="text-sm font-semibold text-primary">
                        Filtres de la vue
                      </h3>
                      <p className="text-xs text-secondary">
                        Configurez les filtres enregistrés.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                    {selectedFilterCount}
                  </span>
                </div>

                {isLoadingOptions ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 6 }, (_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-3">
                      {leftFilterEntries.map(renderFilterCard)}
                    </div>
                    <div className="flex min-w-0 flex-col gap-3">
                      {rightFilterEntries.map(renderFilterCard)}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-default bg-primary-bg px-5 py-4 sm:px-7">
            <div className="text-xs text-red-600">
              {columns.length === 0 && detailsLoaded
                ? "Sélectionnez au moins une colonne."
                : ""}
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsEditorOpen(false)}
                className="rounded-xl border border-default px-4 py-2.5 text-sm text-secondary hover:bg-secondary-bg disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={
                  isSaving ||
                  isEditorLoading ||
                  !name.trim() ||
                  columns.length === 0 ||
                  !userId
                }
                onClick={() => void saveView()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving || isEditorLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isSaving
                  ? "Enregistrement..."
                  : isEditorLoading
                    ? "Chargement..."
                    : "Enregistrer la vue"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ChantierViewsControl;