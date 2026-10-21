"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  Eye,
  EyeOff,
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
  columns: string[];
  filters: ActiveFilters;
  isEphemeral?: boolean;
};

export type ChantierViewsControlProps = {
  structure: CategoryStructure[];
  keyOfFilter: {
    [key: string]: {
      label: string;
      type: FilterType;
      badgeColors?: Record<string, string>;
    };
  };
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

const cleanFilters = (filters: ActiveFilters = {}) =>
  Object.fromEntries(
    Object.entries(filters).filter(
      ([, values]) => Array.isArray(values) && values.length
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

  filters.forEach((filter) => {
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
  });

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
      : column?.code ?? column?.Code;

  if (!code) return null;

  return columnCodeToId[code] ?? code;
};

const toApiColumnCode = (columnId: string): string =>
  columnIdToApiCode[columnId] ?? columnId;

export const normalizeChantierView = (
  item: ApiView
): ChantierView => {
  const planningVue =
    item.planningVue ?? item.PlanningVue ?? item;

  const rawColumns =
    planningVue.ChantierColonnes ??
    planningVue.chantierColonnes ??
    planningVue.Columns ??
    planningVue.columns ??
    planningVue.colonnes;

  const columns = Array.isArray(rawColumns)
    ? rawColumns.map(normalizeColumn).filter(Boolean)
    : [];

  const users =
    item.utilisateursAutorises ??
    item.UtilisateursAutorises ??
    planningVue.utilisateursAutorises ??
    [];

  return {
    id: String(
      planningVue.IdPlanningChantierVue ??
        planningVue.id ??
        planningVue.IdPlanningVue ??
        item.IdPlanningVue
    ),
    name:
      planningVue.LibellePlanningVue ??
      planningVue.libelle ??
      planningVue.name ??
      "Vue sans nom",
    isPrivate:
      (Array.isArray(users) && users.length > 0) ||
      Boolean(planningVue.isPrivate),
    columns: columns.map(String),
    filters: normalizeFilters(item),
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

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const id =
    candidate.IdPlanningChantierVue ??
    candidate.idPlanningChantierVue ??
    candidate.IdPlanningVue ??
    candidate.idPlanningVue ??
    candidate.ValeurParametre ??
    candidate.valeurParametre;

  return id === undefined || id === null || id === ""
    ? null
    : String(id);
};

/* Éléments de chargement réutilisables */

const Skeleton = ({
  className = "",
}: {
  className?: string;
}) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-lg bg-secondary-bg ${className}`}
  />
);

const LoadingMessage = ({
  message,
}: {
  message: string;
}) => (
  <div
    role="status"
    className="flex items-center justify-center gap-3 rounded-xl border border-default bg-secondary-bg px-4 py-5 text-sm text-secondary"
  >
    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
    <span>{message}</span>
  </div>
);

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
  const allColumns = useMemo(
    () =>
      structure.flatMap((category) =>
        category.attributes.map((attribute) => ({
          id: `${category.key}.${attribute.key}`,
          apiCode: toApiColumnCode(
            `${category.key}.${attribute.key}`
          ),
          label: attribute.label || attribute.key,
          categoryLabel: category.label,
        }))
      ),
    [structure]
  );

  const defaultColumns = useMemo(
    () => allColumns.map((column) => column.id),
    [allColumns]
  );

  const initialViewsSignature = useMemo(
    () =>
      initialViews
        .map((view) => `${view.id}:${view.columns.join(",")}`)
        .join("|"),
    [initialViews]
  );

  const filterKeysSignature = useMemo(
    () => Object.keys(keyOfFilter).join(","),
    [keyOfFilter]
  );

  const [views, setViews] = useState<ChantierView[]>(initialViews);
  const [selectedId, setSelectedId] = useState("");
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
  const [detailsLoaded, setDetailsLoaded] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] =
    useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] =
    useState<string | null>(null);
  const [activeFilterKey, setActiveFilterKey] =
    useState<string | null>(null);

  const [deletingViewId, setDeletingViewId] = useState<string | null>(null);

  const activeFiltersRef = useRef(activeFilters);
  const initialViewsRef = useRef(initialViews);

  const columnElementsRef = useRef(
    new Map<string, HTMLDivElement>()
  );
  const previousColumnRectsRef = useRef(
    new Map<string, DOMRect>()
  );
  const draggedColumnRef = useRef<string | null>(null);

  const persistLastChantierView = useCallback(
    async (view: ChantierView) => {
      const viewId = Number(view.sourceViewId ?? view.id);

      if (!Number.isInteger(viewId) || viewId <= 0) return;

      calendarConfigService.setLastChantierView(viewId)
        .then((response) => {
          if (!response.success) {
            throw new Error(
              "Impossible d'enregistrer la dernière vue sélectionnée."
            );
          }
        })
        .catch((reason) => {
          const message = 
            reason instanceof Error
              ? reason.message
              : "Impossible d'enregistrer la dernière vue sélectionnée.";
          console.error(message, reason);
          throw new Error(message);
        });
    },
    []
  );

  const selectView = useCallback(
    (view: ChantierView, persistFilters = true) => {
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
    activeFiltersRef.current = activeFilters;
  }, [activeFilters]);

  initialViewsRef.current = initialViews;

  useEffect(() => {
    const currentViews = initialViewsRef.current;
    setViews(currentViews);

    const initialView =
      currentViews.find((view) => view.id === initialViewId) ??
      currentViews[0];

    if (!initialView) return;

    setSelectedId((current) =>
      current === initialView.id ? current : initialView.id
    );

    const nextColumns = initialView.columns.length
      ? initialView.columns
      : defaultColumns;

    setColumns((current) =>
      current.join(",") === nextColumns.join(",")
        ? current
        : nextColumns
    );
  }, [defaultColumns, initialViewId, initialViewsSignature]);

  const selectedView = views.find(
    (view) => view.id === selectedId
  );

  const hasFilters =
    Object.keys(cleanFilters(activeFilters)).length > 0;

  useEffect(() => {
    if (
      !selectedView?.isEphemeral ||
      selectedView.id === initialViewId ||
      hasFilters
    ) {
      return;
    }

    const fallbackView = views.find(
      (view) => !view.isEphemeral
    );

    if (!fallbackView) return;

    setSelectedId(fallbackView.id);
    setColumns(
      fallbackView.columns.length
        ? fallbackView.columns
        : defaultColumns
    );

    onViewChange(fallbackView);
  }, [
    defaultColumns,
    hasFilters,
    initialViewId,
    onViewChange,
    selectedView,
    views,
  ]);

  // Animation FLIP pour le déplacement des colonnes.
  useLayoutEffect(() => {
    const previousRects = previousColumnRectsRef.current;

    columnElementsRef.current.forEach((element, id) => {
      const previous = previousRects.get(id);

      if (!previous || id === draggedColumnRef.current) {
        return;
      }

      const current = element.getBoundingClientRect();
      const deltaX = previous.left - current.left;
      const deltaY = previous.top - current.top;

      if (
        Math.abs(deltaX) < 1 &&
        Math.abs(deltaY) < 1
      ) {
        return;
      }

      element.style.transition = "none";
      element.style.transform =
        `translate(${deltaX}px, ${deltaY}px)`;

      void element.offsetHeight;

      element.style.transition =
        "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
      element.style.transform = "";

      const handleTransitionEnd = (
        event: TransitionEvent
      ) => {
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

  const openEditor = (view?: ChantierView) => {
    setEditingView(
      view && !view.isEphemeral ? view : null
    );
    setName(
      view?.name === "Vue éphémère" ? "" : view?.name || ""
    );
    setIsPrivate(view?.isPrivate || false);
    setSelectedUsers([]);
    setColumns(
      view?.columns.length ? view.columns : defaultColumns
    );
    setFilterDraft(view?.filters || {});
    setActiveFilterKey(null);
    setError(null);

    setOptionsLoaded(false);
    setDetailsLoaded(false);
    setIsLoadingOptions(false);
    setIsLoadingDetails(false);

    setIsEditorOpen(true);
  };

  // Chargement des utilisateurs et des options des filtres.
  useEffect(() => {
    if (!isEditorOpen) return;

    let cancelled = false;

    setIsLoadingOptions(true);
    setOptionsLoaded(false);

    Promise.all([
      calendarConfigService.getAllUsersForVue(),
      ressourceService.getFilterOptionsDynamic(
        "chantier-table",
        Object.keys(keyOfFilter)
      ),
    ])
      .then(([usersResponse, filtersResponse]) => {
        if (cancelled) return;

        const users =
          usersResponse?.data ?? usersResponse ?? [];

        setAvailableUsers(
          Array.isArray(users)
            ? users
                .map((user: any) => ({
                  Id: Number(user.Id ?? user.IdPersonnel),
                  Nom: user.Nom ?? user.name ?? "",
                  Prenom: user.Prenom ?? user.firstName,
                }))
                .filter((user) => user.Id)
            : []
        );

        const payload =
          filtersResponse?.data?.filters ??
          filtersResponse?.data?.Filters ??
          filtersResponse?.data ??
          {};

        if (payload && typeof payload === "object") {
          const normalizedOptions = Object.fromEntries(
            Object.entries(payload).map(([key, rawOptions]) => {
              const options = Array.isArray(rawOptions)
                ? rawOptions
                    .map((option: any) =>
                      typeof option === "string"
                        ? {
                            value: option,
                            label: option,
                          }
                        : {
                            value: String(
                              option.value ??
                                option.Id ??
                                option.id ??
                                ""
                            ),
                            label:
                              option.label ??
                              option.Nom ??
                              option.name ??
                              String(
                                option.value ??
                                  option.Id ??
                                  ""
                              ),
                          }
                    )
                    .filter((option) => option.value)
                : [];

              return [key, options];
            })
          );

          setFilterOptions(normalizedOptions);
        }

        setOptionsLoaded(true);
      })
      .catch((reason) => {
        if (cancelled) return;

        console.error(
          "Impossible de charger les utilisateurs ou les options de filtres.",
          reason
        );

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
  }, [isEditorOpen, filterKeysSignature, keyOfFilter]);

  // Chargement des détails de la vue.
  useEffect(() => {
    if (!isEditorOpen) return;

    let cancelled = false;
    const viewId = editingView ? Number(editingView.id) : 0;

    setIsLoadingDetails(true);
    setDetailsLoaded(false);

    calendarConfigService
      .getChantierViewDetails(viewId, "chantier-table")
      .then((response: any) => {
        if (cancelled) return;

        if (response?.success === false) {
          throw new Error(
            response.message ||
              "Impossible de charger les données de la vue."
          );
        }

        const payload = response?.data ?? response;
        const details = normalizeChantierView(payload);

        setColumns(
          details.columns.length
            ? details.columns
            : defaultColumns
        );

        if (editingView) {
          if (details.name !== "Vue sans nom") {
            setName(details.name);
          }

          setFilterDraft(details.filters);

          const planningVue =
            payload?.planningVue ??
            payload?.PlanningVue ??
            payload;

          const users =
            payload?.utilisateursAutorises ??
            payload?.UtilisateursAutorises ??
            planningVue?.utilisateursAutorises ??
            [];

          const userIds = Array.isArray(users)
            ? users
                .map((user: any) =>
                  Number(
                    user?.Id ??
                      user?.IdPersonnel ??
                      user
                  )
                )
                .filter(Boolean)
            : [];

          setIsPrivate(userIds.length > 0);
          setSelectedUsers(userIds);
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
  }, [defaultColumns, editingView, isEditorOpen]);

  const toggleFilterValue = (
    key: string,
    value: string
  ) => {
    setFilterDraft((current) => {
      const values = current[key] || [];

      const nextValues = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];

      return {
        ...current,
        [key]: nextValues,
      };
    });
  };

  const moveColumn = (target: string) => {
    const source =
      draggedColumnRef.current ?? draggedColumn;

    if (!source || source === target) return;

    setColumns((current) => {
      const from = current.indexOf(source);
      const to = current.indexOf(target);

      if (from < 0 || to < 0 || from === to) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(from, 1);

      next.splice(to, 0, moved);

      return next;
    });

    setDraggedColumn(null);
    draggedColumnRef.current = null;
  };

  const saveView = async () => {
    if (
      !name.trim() ||
      !userId ||
      columns.length === 0 ||
      isLoadingOptions ||
      isLoadingDetails
    ) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const filters = cleanFilters(filterDraft);

    console.log("filters", filters);

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
        : await calendarConfigService.createChantierView(
            payload
          );

      if (response?.success === false) {
        throw new Error(
          response.message ||
            "Impossible d'enregistrer la vue."
        );
      }

      const saved = normalizeChantierView(
        response?.data ?? response
      );

      const savedId = editingView?.id || saved.id;

      if (
        !savedId ||
        savedId === "undefined" ||
        Number.isNaN(Number(savedId)) ||
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
        columns,
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
  };

  const selectedFilterCount = Object.keys(
    cleanFilters(filterDraft)
  ).length;

  const availableColumns = allColumns.filter(
    (column) => !columns.includes(column.id)
  );

  const isEditorLoading =
    isLoadingOptions || isLoadingDetails;

  const filterEntries = Object.entries(keyOfFilter);

  const leftFilterEntries = filterEntries.filter(
    (_, index) => index % 2 === 0
  );

  const rightFilterEntries = filterEntries.filter(
    (_, index) => index % 2 !== 0
  );

  const renderFilterCard = (
    [key, category]: (typeof filterEntries)[number]
  ) => {
    const options = filterOptions[key] || [];
    const values = filterDraft[key] || [];
    const isExpanded =
      activeFilterKey === key || values.length > 0;

    return (
      <div
        key={key}
        className="min-w-0 overflow-hidden rounded-xl border border-default bg-primary-bg transition-colors duration-200 hover:border-primary/30"
      >
        <button
          type="button"
          onClick={() =>
            setActiveFilterKey(
              activeFilterKey === key ? null : key
            )
          }
          aria-expanded={isExpanded}
          className="cursor-pointer flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-secondary-bg"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-primary">
              {category.label}
            </span>
            <span className="mt-0.5 block text-xs text-secondary">
              {values.length
                ? `${values.length} sélectionné(s)`
                : "Tous les éléments"}
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-2">
            {values.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                {values.length}
              </span>
            )}

            <svg
              viewBox="0 0 20 20"
              fill="none"
              className={`h-4 w-4 text-secondary transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            >
              <path
                d="m5 7.5 5 5 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
            isExpanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-default p-3">
              {category.type === "select" ? (
                <select
                  value={values[0] || ""}
                  onChange={(event) =>
                    setFilterDraft((current) => ({
                      ...current,
                      [key]: event.target.value
                        ? [event.target.value]
                        : [],
                    }))
                  }
                  className="w-full rounded-xl border border-default bg-secondary-bg px-3 py-2.5 text-sm text-primary outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                >
                  <option value="">Tous</option>
                  {options.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="max-h-44 space-y-1 overflow-y-auto">
                  {options.map((option) => {
                    const checked = values.includes(
                      option.value
                    );

                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                          checked
                            ? "bg-primary/5 text-primary"
                            : "text-secondary hover:bg-secondary-bg"
                        }`}
                      >
                        <input
                          type={
                            category.type === "radio"
                              ? "radio"
                              : "checkbox"
                          }
                          name={key}
                          checked={checked}
                          onChange={() =>
                            category.type === "radio"
                              ? setFilterDraft((current) => ({
                                  ...current,
                                  [key]: [option.value],
                                }))
                              : toggleFilterValue(
                                  key,
                                  option.value
                                )
                          }
                          className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                        />

                        <span className="min-w-0 flex-1 break-words">
                          {option.label}
                        </span>

                        {checked && (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              {!options.length && (
                <p className="py-3 text-center text-xs text-secondary">
                  Aucune option disponible.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isDeletableView = (view?: ChantierView | null): boolean => {
    if (!view || view.isEphemeral) return false;
    const numericId = Number(view.id);
    return Number.isInteger(numericId) && numericId > 0;
  };

  const deleteView = useCallback(
    async (targetView: ChantierView) => {
      if (!isDeletableView(targetView) || deletingViewId) return;

      const numericId = Number(targetView.id);
      setDeletingViewId(targetView.id);
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
          numericId
        );

        if (response?.success === false) {
          throw new Error(
            response.message ||
              "Impossible de supprimer la vue."
          );
        }

        const remainingViews = views.filter(
          (v) => v.id !== targetView.id
        );
        setViews(remainingViews);

        if (editingView?.id === targetView.id) {
          setIsEditorOpen(false);
          setEditingView(null);
        }

        if (selectedId === targetView.id) {
          const fallback =
            remainingViews.find((v) => !v.isEphemeral) ??
            remainingViews[0] ??
            null;

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

        if (isEditorOpen) {
          setError(message);
        }
        console.error(message, reason);
      } finally {
        setDeletingViewId(null);
      }
    },
    [
      defaultColumns,
      deletingViewId,
      editingView,
      isEditorOpen,
      onViewChange,
      selectView,
      selectedId,
      views,
    ]
  );

  return (
    <>
      {/* Sélection des vues */}
      <div
        className={
          compact
            ? "relative flex items-center gap-2"
            : "mb-5 flex items-center justify-between gap-4 px-1 py-2"
        }
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {!compact && (
              <>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Globe2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary">
                    Configuration
                  </p>

                  <p className="max-w-64 truncate text-sm font-semibold text-primary">
                    {hasFilters
                      ? "Vue éphémère"
                      : selectedView?.name || "Vue par défaut"}
                  </p>
                </div>
              </>
            )}

            <div className="min-w-[290px]">
              <CustomSelectWithImage
                options={views.map((view) => ({
                  id: view.id,
                  value: view.id,
                  name: view.name,
                  icon: view.isEphemeral ? (
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  ) : view.isPrivate ? (
                    <Lock className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Globe2 className="h-4 w-4 text-primary" />
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
                onDeleteOption={(option) => {
                  const target = views.find(
                    (item) => item.id === String(option.id)
                  );
                  if (target) return deleteView(target);
                }}
                deletingOptionId={deletingViewId}
                placeholder={
                  views.length
                    ? "Sélectionner une vue"
                    : "Aucune vue enregistrée"
                }
                illustrationImage={
                  <Globe2 className="h-4 w-4 text-primary" />
                }
                className="rounded-xl border-default bg-secondary-bg px-2 py-1.5"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!selectedView?.isEphemeral && selectedView && (
              <button
                type="button"
                onClick={() => openEditor(selectedView)}
                disabled={isSaving}
                className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-xl border border-default bg-primary-bg text-secondary transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:text-primary disabled:opacity-50"
                title="Modifier la vue"
                aria-label="Modifier la vue"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => openEditor()}
              disabled={isSaving}
              className={
                compact
                  ? "cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-all duration-200 hover:bg-primary-dark disabled:opacity-50"
                  : "cursor-pointer inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary-dark disabled:opacity-50"
              }
              title={compact ? "Créer une vue" : undefined}
              aria-label={compact ? "Créer une vue" : undefined}
            >
              <Plus className="h-4 w-4" />
              {!compact && "Créer une vue"}
            </button>
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
          {/* CORPS SCROLLABLE */}
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {/* Alerte d'erreur */}
            {error && (
              <div
                role="alert"
                className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <X className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1">{error}</span>
              </div>
            )}

            {isLoadingDetails && (
              <LoadingMessage message="Chargement des données de la vue..." />
            )}

            {/* SECTION 1 : NOM & VISIBILITÉ */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Nom de la vue (6 cols) */}
              <section className="flex flex-col justify-between rounded-2xl border border-default bg-secondary-bg/50 p-4 sm:p-5 lg:col-span-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-secondary">
                      Nom de la vue <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] tabular-nums text-secondary">
                      {name.length}/100
                    </span>
                  </div>

                  {isLoadingDetails ? (
                    <Skeleton className="h-11 w-full rounded-xl" />
                  ) : (
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ex. Suivi des chantiers en cours"
                      maxLength={100}
                      className="w-full rounded-xl border border-default bg-primary-bg px-4 py-3 text-sm font-medium text-primary shadow-sm outline-none transition-all duration-200 placeholder:font-normal placeholder:text-secondary/50 focus:border-primary focus:ring-4 focus:ring-primary/10"
                      autoFocus
                    />
                  )}
                </div>
                <p className="mt-2.5 text-xs text-secondary">
                  Nommez clairement votre vue pour la retrouver en un clic.
                </p>
              </section>

              {/* Visibilité avec TOGGLE (6 cols) */}
              <section
                className={`flex flex-col justify-between rounded-2xl border-2 p-4 transition-all duration-200 sm:p-5 lg:col-span-6 ${
                  isPrivate
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-default bg-secondary-bg/50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    Visibilité de la vue
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      isPrivate
                        ? "bg-primary text-white"
                        : "bg-emerald-500/15 text-emerald-700"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isPrivate ? "bg-white" : "bg-emerald-500"
                      }`}
                    />
                    {isPrivate ? "Accès restreint" : "Accès public"}
                  </span>
                </div>

                {isLoadingDetails ? (
                  <Skeleton className="my-2 h-12 w-full rounded-xl" />
                ) : (
                  <label
                    className="mt-2.5 grid cursor-pointer grid-cols-2 gap-1.5 rounded-xl border border-default bg-primary-bg p-1.5 shadow-inner select-none"
                    aria-label="Rendre la vue privée"
                  >
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(event) => setIsPrivate(event.target.checked)}
                      className="sr-only"
                    />

                    {/* Option 1 : Partagée */}
                    <span
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                        !isPrivate
                          ? "bg-primary text-white shadow-md scale-[1.01]"
                          : "text-secondary hover:bg-secondary-bg hover:text-primary"
                      }`}
                    >
                      <Eye className="h-4 w-4 shrink-0" />
                      <span>Vue partagée</span>
                    </span>

                    {/* Option 2 : Privée */}
                    <span
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                        isPrivate
                          ? "bg-primary text-white shadow-md scale-[1.01]"
                          : "text-secondary hover:bg-secondary-bg hover:text-primary"
                      }`}
                    >
                      <EyeOff className="h-4 w-4 shrink-0" />
                      <span>Vue privée</span>
                    </span>
                  </label>
                )}

                <p className="mt-2.5 text-xs text-secondary">
                  {isPrivate
                    ? "Seuls vous et les utilisateurs cochés ci-dessous y avez accès."
                    : "Tous les utilisateurs autorisés peuvent consulter cette vue."}
                </p>
              </section>
            </div>

            {/* Sous-panneau : Utilisateurs autorisés (affiché si privé) */}
            {isPrivate && (
              <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Utilisateurs autorisés
                    </h4>
                    <p className="text-xs text-secondary">
                      Cliquez sur les collaborateurs pour leur donner accès à cette vue.
                    </p>
                  </div>
                  <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                    {selectedUsers.length} sélectionné{selectedUsers.length > 1 ? "s" : ""}
                  </span>
                </div>

                {isLoadingOptions ? (
                  <div role="status" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="h-11 w-full rounded-xl" />
                    ))}
                    <span className="sr-only">Chargement des utilisateurs...</span>
                  </div>
                ) : (
                  <div className="grid max-h-44 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                    {availableUsers
                      .filter((user) => user.Id !== userId)
                      .map((user) => {
                        const checked = selectedUsers.includes(user.Id);
                        const initials =
                          `${user.Prenom?.[0] || ""}${user.Nom?.[0] || ""}`.toUpperCase();

                        return (
                          <label
                            key={user.Id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-all duration-150 select-none ${
                              checked
                                ? "border-primary bg-primary-bg text-primary shadow-sm ring-1 ring-primary/20"
                                : "border-default bg-primary-bg/70 text-secondary hover:border-primary/40 hover:bg-primary-bg"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setSelectedUsers((current) =>
                                  checked
                                    ? current.filter((id) => id !== user.Id)
                                    : [...current, user.Id]
                                )
                              }
                              className="sr-only"
                            />

                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                                checked
                                  ? "bg-primary text-white"
                                  : "bg-secondary-bg text-secondary"
                              }`}
                            >
                              {initials || "?"}
                            </span>

                            <span className="min-w-0 flex-1 truncate font-medium">
                              {user.Nom} {user.Prenom || ""}
                            </span>

                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                checked
                                  ? "border-primary bg-primary text-white"
                                  : "border-default bg-secondary-bg"
                              }`}
                            >
                              {checked && <Check className="h-3.5 w-3.5" />}
                            </span>
                          </label>
                        );
                      })}

                    {optionsLoaded &&
                      availableUsers.filter((user) => user.Id !== userId).length === 0 && (
                        <p className="col-span-full py-4 text-center text-xs text-secondary">
                          Aucun utilisateur disponible.
                        </p>
                      )}
                  </div>
                )}
              </section>
            )}

            {/* GRILLE CÔTE À CÔTE : COLONNES (GAUCHE) ET FILTRES (DROITE) */}
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
              
              {/* SECTION 2 : COLONNES */}
              <section className="flex flex-col rounded-2xl border border-default bg-secondary-bg/40 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-primary">
                      Colonnes affichées et ordre
                    </h3>
                    <p className="mt-0.5 text-xs text-secondary">
                      Glissez ou utilisez les flèches pour réordonner les colonnes.
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {columns.length} colonne{columns.length > 1 ? "s" : ""}
                  </span>
                </div>

                {isLoadingDetails ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <Skeleton className="h-64 w-full rounded-2xl lg:col-span-4" />
                    <Skeleton className="h-64 w-full rounded-2xl lg:col-span-8" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
                    {/* PANNEAU GAUCHE : Colonnes disponibles (réduit à 4 colonnes) */}
                    <div className="flex flex-col rounded-2xl border border-default bg-primary-bg p-3.5 lg:col-span-4">
                      <div className="mb-3 flex items-center justify-between border-b border-default pb-2.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                          Disponibles ({availableColumns.length})
                        </span>

                        {availableColumns.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setColumns((current) => [
                                ...current,
                                ...availableColumns.map((col) => col.id),
                              ])
                            }
                            className="cursor-pointer text-xs font-semibold text-primary transition-opacity hover:opacity-80"
                          >
                            + Tout
                          </button>
                        )}
                      </div>

                      <div className="max-h-[500px] flex-1 space-y-4 overflow-y-auto pr-1">
                        {Array.from(
                          new Map(
                            availableColumns.map((column) => [
                              column.categoryLabel,
                              availableColumns.filter(
                                (availableColumn) =>
                                  availableColumn.categoryLabel === column.categoryLabel
                              ),
                            ])
                          ).entries()
                        ).map(([categoryLabel, categoryColumns]) => (
                          <div key={categoryLabel} className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary/80">
                              {categoryLabel}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {categoryColumns.map((column) => (
                                <button
                                  key={column.id}
                                  type="button"
                                  onClick={() =>
                                    setColumns((current) => [...current, column.id])
                                  }
                                  className="cursor-pointer group inline-flex items-center gap-1.5 rounded-xl border border-dashed border-default bg-secondary-bg/40 px-2.5 py-1.5 text-xs font-medium text-primary transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 active:translate-y-0"
                                >
                                  <Plus className="h-3.5 w-3.5 text-primary transition-transform duration-200 group-hover:rotate-90" />
                                  <span className="truncate">{column.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}

                        {!availableColumns.length && (
                          <div className="flex h-32 flex-col items-center justify-center text-center">
                            <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Check className="h-4 w-4" />
                            </span>
                            <p className="text-xs font-medium text-primary">
                              Toutes affichées.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PANNEAU DROIT : Ordre d'affichage (élargi à 8 colonnes, hauteur illimitée) */}
                    <div className="flex flex-col rounded-2xl border border-default bg-primary-bg p-3.5 lg:col-span-8">
                      <div className="mb-3 flex items-center justify-between border-b border-default pb-2.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                          Ordre d'affichage ({columns.length})
                        </span>

                        {columns.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setColumns([])}
                            className="cursor-pointer text-xs font-medium text-secondary transition-colors hover:text-red-600"
                          >
                            Tout retirer
                          </button>
                        )}
                      </div>

                      {columns.length > 0 ? (
                        <div className="relative flex-1 space-y-1.5 pr-1">
                          {columns.map((id, index) => {
                            const column = allColumns.find((item) => item.id === id);
                            if (!column) return null;

                            const isDragged = draggedColumn === id;
                            const isDropTarget =
                              dragOverColumn === id && draggedColumn !== id;

                            return (
                              <div
                                key={id}
                                ref={(element) => {
                                  if (element) {
                                    columnElementsRef.current.set(id, element);

                                    const prevTopAttr = element.dataset.offsetTop;
                                    const currentTop = element.offsetTop;
                                    element.dataset.offsetTop = String(currentTop);

                                    if (prevTopAttr !== undefined) {
                                      const deltaY = Number(prevTopAttr) - currentTop;
                                      if (Math.abs(deltaY) > 2 && typeof element.animate === "function") {
                                        element.animate(
                                          [
                                            {
                                              transform: `translateY(${deltaY}px) scale(1.01)`,
                                              zIndex: 20,
                                              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.12)",
                                            },
                                            {
                                              transform: "translateY(0px) scale(1)",
                                              zIndex: 1,
                                              boxShadow: "0 0 0 0 rgba(0, 0, 0, 0)",
                                            },
                                          ],
                                          {
                                            duration: 280,
                                            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                                          }
                                        );
                                      }
                                    } else if (typeof element.animate === "function") {
                                      element.animate(
                                        [
                                          { opacity: 0, transform: "translateX(-16px)" },
                                          { opacity: 1, transform: "translateX(0px)" },
                                        ],
                                        {
                                          duration: 220,
                                          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                                        }
                                      );
                                    }
                                  } else {
                                    columnElementsRef.current.delete(id);
                                  }
                                }}
                                onDragOver={(event) => {
                                  event.preventDefault();
                                  event.dataTransfer.dropEffect = "move";
                                  if (draggedColumn !== id) {
                                    setDragOverColumn(id);
                                  }
                                }}
                                onDragLeave={(event) => {
                                  const related = event.relatedTarget;
                                  if (
                                    !(related instanceof Node) ||
                                    !event.currentTarget.contains(related)
                                  ) {
                                    setDragOverColumn(null);
                                  }
                                }}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  moveColumn(id);
                                  setDragOverColumn(null);
                                }}
                                className={[
                                  "group relative flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm text-primary",
                                  "transition-[background-color,border-color,transform,opacity] duration-200 ease-out",
                                  isDragged
                                    ? "z-10 scale-[0.98] border-primary bg-primary/10 opacity-45"
                                    : isDropTarget
                                      ? "translate-y-1 border-primary bg-primary/10 shadow-md ring-2 ring-primary/20"
                                      : "border-default/70 bg-secondary-bg/30 hover:border-default hover:bg-secondary-bg",
                                ].join(" ")}
                              >
                                {/* Poignée de glissement */}
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
                                  className="flex h-8 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-secondary transition-colors hover:bg-primary/10 hover:text-primary active:cursor-grabbing"
                                  aria-label={`Déplacer ${column.label}`}
                                  title="Glisser pour déplacer"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </button>

                                {/* Numéro d'ordre */}
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold tabular-nums text-primary">
                                  {index + 1}
                                </span>

                                {/* Libellé de la colonne */}
                                <span className="min-w-0 flex-1 truncate font-medium">
                                  {column.label}
                                </span>

                                {/* Catégorie */}
                                <span className="hidden shrink-0 rounded-md bg-primary-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary sm:inline-block">
                                  {column.categoryLabel}
                                </span>

                                <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-default bg-primary-bg p-0.5">
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
                                    className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-md text-secondary transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                                    aria-label={`Monter ${column.label}`}
                                    title="Faire glisser vers le haut"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="h-3.5 w-3.5"
                                    >
                                      <path d="m18 15-6-6-6 6" />
                                    </svg>
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
                                    className="cursor-pointer flex h-6 w-6 items-center justify-center rounded-md text-secondary transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                                    aria-label={`Descendre ${column.label}`}
                                    title="Faire glisser vers le bas"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="h-3.5 w-3.5"
                                    >
                                      <path d="m6 9 6 6 6-6" />
                                    </svg>
                                  </button>
                                </div>

                                {/* Bouton supprimer */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setColumns((current) =>
                                      current.filter((columnId) => columnId !== id)
                                    )
                                  }
                                  className="cursor-pointer flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                  aria-label={`Retirer ${column.label}`}
                                  title="Retirer cette colonne"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-bg text-secondary">
                            <SlidersHorizontal className="h-5 w-5" />
                          </div>
                          <p className="text-sm font-semibold text-primary">
                            Aucune colonne sélectionnée
                          </p>
                          <p className="mt-1 text-xs text-secondary">
                            Ajoutez les colonnes nécessaires depuis la liste de gauche.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* SECTION 3 : FILTRES */}
              <section className="flex flex-col rounded-2xl border border-default bg-secondary-bg/40 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <SlidersHorizontal className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-primary">
                        Filtres de la vue
                      </h3>
                      <p className="mt-0.5 text-xs text-secondary">
                        Configurez les filtres enregistrés avec la vue.
                      </p>
                    </div>
                  </div>

                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2.5 text-xs font-semibold text-white">
                    {selectedFilterCount}
                  </span>
                </div>

                {isLoadingOptions ? (
                  <div role="status" className="grid gap-3 md:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="space-y-3 rounded-xl border border-default bg-primary-bg p-3"
                      >
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    ))}
                    <span className="sr-only">Chargement des options de filtres...</span>
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

          {/* FOOTER FIXE */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-default bg-primary-bg px-5 py-4 sm:px-7">
            <div className="text-xs">
              {columns.length === 0 && detailsLoaded && (
                <span
                  role="alert"
                  className="inline-flex items-center gap-1.5 font-medium text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                  Sélectionnez au moins une colonne pour enregistrer la vue.
                </span>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsEditorOpen(false)}
                className="cursor-pointer rounded-xl border border-default px-4 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-secondary-bg hover:text-primary disabled:opacity-50"
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
                className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-primary-dark hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
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