"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Eye, EyeOff, Globe2, GripVertical, Loader2, Plus, SlidersHorizontal, X } from "lucide-react";
import Modal from "../modals/Modal";
import CustomSelectWithImage from "../ui/CustomSelectWithImage";
import type { ActiveFilters, FilterOption, FilterType } from "../../utils/searchAndFilterUtils";
import type { CategoryStructure } from "./DataTableFrame";
import calendarConfigService from "@/app/service/calendarConfig.service";
import ressourceService from "@/app/service/ressource.service";

export type ChantierView = {
  id: string;
  name: string;
  isPrivate: boolean;
  columns: string[];
  filters: ActiveFilters;
};

type Props = {
  structure: CategoryStructure[];
  keyOfFilter: { [key: string]: { label: string; type: FilterType; badgeColors?: Record<string, string> } };
  activeFilters: ActiveFilters;
  userId?: number;
  planningId: number;
  onViewChange: (view: ChantierView | null) => void;
  onFiltersChange: (filters: ActiveFilters) => void;
};

type ApiView = Record<string, any>;
type ViewUser = { Id: number; Nom: string; Prenom?: string };

const cleanFilters = (filters: ActiveFilters = {}) =>
  Object.fromEntries(Object.entries(filters).filter(([, values]) => Array.isArray(values) && values.length));

const normalizeFilters = (details: ApiView): ActiveFilters => {
  const source = details.activeFilters ?? details.ActiveFilters;
  if (source && typeof source === "object" && !Array.isArray(source)) return cleanFilters(source);

  const result: ActiveFilters = {};
  const filters = details.filtrePerso ?? details.FiltrePerso ?? [];
  if (!Array.isArray(filters)) return result;
  filters.forEach(filter => {
    const key = filter.CodeFiltre ?? filter.Code ?? filter.code ?? filter.IdFiltre;
    const values = filter.Valeurs ?? filter.Valeur ?? [];
    const selected = Array.isArray(values)
      ? values.filter((value: any) => value.Selection === 1 || value.selected).map((value: any) => String(value.Id ?? value.id ?? value.Value ?? value.value))
      : [];
    if (key && selected.length) result[String(key)] = selected;
  });
  return result;
};

const normalizeView = (item: ApiView): ChantierView => {
  const planningVue = item.planningVue ?? item.PlanningVue ?? item;
  const columns = planningVue.ChantierColonnes ?? planningVue.chantierColonnes ?? planningVue.Columns ?? planningVue.columns;
  const users = item.utilisateursAutorises ?? item.UtilisateursAutorises ?? planningVue.utilisateursAutorises ?? [];
  return {
    id: String(planningVue.IdPlanningVue ?? item.IdPlanningVue),
    name: planningVue.LibellePlanningVue ?? planningVue.name ?? "Vue sans nom",
    isPrivate: Array.isArray(users) && users.length > 0 || Boolean(planningVue.isPrivate),
    columns: Array.isArray(columns) ? columns.map(String) : [],
    filters: normalizeFilters(item),
  };
};

const ChantierViewsControl: React.FC<Props> = ({
  structure, keyOfFilter, activeFilters, userId, planningId, onViewChange, onFiltersChange,
}) => {
  const allColumns = useMemo(() => structure.flatMap(category => category.attributes.map(attribute => ({
    id: `${category.key}.${attribute.key}`,
    label: attribute.label || attribute.key,
  }))), [structure]);
  const defaultColumns = useMemo(() => allColumns.map(column => column.id), [allColumns]);
  const [views, setViews] = useState<ChantierView[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [columns, setColumns] = useState<string[]>(defaultColumns);
  const [filterDraft, setFilterDraft] = useState<ActiveFilters>({});
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ViewUser[]>([]);
  const [filterOptions, setFilterOptions] = useState<Record<string, FilterOption[]>>({});
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);
  const activeFiltersRef = React.useRef(activeFilters);

  const loadViewDetails = useCallback(async (view: ChantierView) => {
    const response = await calendarConfigService.getChantierViewDetails(Number(view.id));
    if (response?.success === false) throw new Error(response.message || "Impossible de charger les filtres de la vue.");
    const details = response?.data ?? response;
    return { ...view, filters: normalizeFilters(details) };
  }, []);

  const selectView = useCallback(async (view: ChantierView) => {
    setSelectedId(view.id);
    setColumns(view.columns.length ? view.columns : defaultColumns);
    setError(null);
    try {
      const detailedView = await loadViewDetails(view);
      onViewChange(detailedView);
      const currentFilters = cleanFilters(activeFiltersRef.current);
      onFiltersChange(Object.keys(currentFilters).length ? currentFilters : detailedView.filters);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Impossible de charger la vue.";
      setError(message);
      console.error(message, reason);
    }
  }, [defaultColumns, loadViewDetails, onFiltersChange, onViewChange]);

  useEffect(() => {
    activeFiltersRef.current = activeFilters;
  }, [activeFilters]);

  useEffect(() => {
    if (!userId || !planningId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    calendarConfigService.getChantierViews(userId, planningId)
      .then(async response => {
        if (response?.success === false) throw new Error(response.message || "Impossible de charger les vues.");
        const payload = response?.data?.Configs ?? response?.data?.configs ?? response?.data ?? [];
        const loadedViews = (Array.isArray(payload) ? payload : []).map(normalizeView).filter(view => view.id && view.id !== "undefined");
        if (cancelled) return;
        setViews(loadedViews);
        if (loadedViews[0]) await selectView(loadedViews[0]);
      })
      .catch(reason => {
        if (cancelled) return;
        const message = reason instanceof Error ? reason.message : "Impossible de charger les vues.";
        setError(message);
        console.error(message, reason);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [planningId, selectView, userId]);

  const selectedView = views.find(view => view.id === selectedId);
  const hasFilters = Object.keys(cleanFilters(activeFilters)).length > 0;
  const openNewView = () => {
    setName("");
    setIsPrivate(false);
    setSelectedUsers([]);
    setColumns(defaultColumns);
    setFilterDraft({});
    setActiveFilterKey(null);
    setError(null);
    setIsEditorOpen(true);
  };

  useEffect(() => {
    if (!isEditorOpen) return;
    let cancelled = false;
    Promise.all([
      calendarConfigService.getAllUsersForVue(),
      ressourceService.getFilterOptionsDynamic("chantier-table", Object.keys(keyOfFilter)),
    ]).then(([usersResponse, filtersResponse]) => {
      if (cancelled) return;
      const users = usersResponse?.data ?? usersResponse ?? [];
      setAvailableUsers(Array.isArray(users) ? users.map((user: any) => ({
        Id: Number(user.Id ?? user.IdPersonnel),
        Nom: user.Nom ?? user.name ?? "",
        Prenom: user.Prenom ?? user.firstName,
      })).filter(user => user.Id) : []);
      const payload = filtersResponse?.data?.filters ?? filtersResponse?.data?.Filters ?? filtersResponse?.data ?? {};
      if (payload && typeof payload === "object") {
        const normalizedOptions = Object.fromEntries(Object.entries(payload).map(([key, rawOptions]) => {
          const options = Array.isArray(rawOptions)
            ? rawOptions.map((option: any) => typeof option === "string"
              ? { value: option, label: option }
              : {
                value: String(option.value ?? option.Id ?? option.id ?? ""),
                label: option.label ?? option.Nom ?? option.name ?? String(option.value ?? option.Id ?? ""),
              }).filter(option => option.value)
            : [];
          return [key, options];
        }));
        setFilterOptions(normalizedOptions);
      }
    }).catch(reason => {
      console.error("Impossible de charger les utilisateurs ou les options de filtres.", reason);
      setError("Impossible de charger les options de la vue.");
    });
    return () => { cancelled = true; };
  }, [isEditorOpen, keyOfFilter]);

  const toggleFilterValue = (key: string, value: string) => {
    setFilterDraft(current => {
      const values = current[key] || [];
      const nextValues = values.includes(value) ? values.filter(item => item !== value) : [...values, value];
      return { ...current, [key]: nextValues };
    });
  };

  const saveView = async () => {
    if (!name.trim() || !userId) return;
    setIsSaving(true);
    setError(null);
    const filters = cleanFilters(filterDraft);
    const filtrePerso = Object.entries(filters).map(([code, values]) => ({ IdFiltre: code, Valeurs: values }));
    try {
      const response = await calendarConfigService.createChantierView({
        planningVue: {
          IdPlanningVue: 0,
          IdPlanning: planningId,
          TypeVue: "chantier-table",
          LibellePlanningVue: name.trim(),
          ChantierColonnes: columns,
        },
        filtrePerso,
        utilisateursAutorises: isPrivate ? Array.from(new Set([userId, ...selectedUsers])) : [],
      });
      if (response?.success === false) throw new Error(response.message || "Impossible d'enregistrer la vue.");
      const created = normalizeView(response?.data ?? response);
      if (!created.id || created.id === "undefined" || Number.isNaN(Number(created.id)) || Number(created.id) <= 0) {
        throw new Error("L'API n'a pas renvoyé l'identifiant de la vue créée.");
      }
      const next = { ...created, name: created.name === "Vue sans nom" ? name.trim() : created.name, columns, filters, isPrivate };
      setViews(current => [...current, next]);
      setIsEditorOpen(false);
      await selectView(next);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Impossible d'enregistrer la vue.";
      setError(message);
      console.error(message, reason);
    } finally {
      setIsSaving(false);
    }
  };

  const moveColumn = (target: string) => {
    if (!draggedColumn || draggedColumn === target) return;
    setColumns(current => {
      const next = [...current];
      const from = next.indexOf(draggedColumn);
      const to = next.indexOf(target);
      next.splice(from, 1);
      next.splice(to, 0, draggedColumn);
      return next;
    });
    setDraggedColumn(null);
  };

  return (
    <>
      <div className="mb-5 rounded-2xl border border-default bg-primary-bg px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Globe2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Vue du tableau</p>
              <p className="truncate text-sm font-semibold text-primary">{hasFilters ? "Vue éphémère" : selectedView?.name || "Vue par défaut"}</p>
            </div>
            <div className="min-w-[230px]">
              <CustomSelectWithImage
                options={views.map(view => ({ id: view.id, value: view.id, name: view.name }))}
                value={selectedId}
                disabled={isLoading}
                onChange={value => {
                  const view = views.find(item => item.id === String(value));
                  if (view) void selectView(view);
                }}
                placeholder={views.length ? "Sélectionner une vue" : "Aucune vue enregistrée"}
                illustrationImage={<Globe2 className="h-4 w-4 text-primary" />}
                onAddOption={openNewView}
                addOptionLabel="Créer une vue"
                className="rounded-xl border-default bg-secondary-bg px-3 py-2"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            <button type="button" onClick={openNewView} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark">
              <Plus className="h-4 w-4" /> Créer une vue
            </button>
          </div>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
      </div>

      <Modal isOpen={isEditorOpen} onClose={() => !isSaving && setIsEditorOpen(false)} title="Créer une vue du tableau" className="w-[95vw] max-w-5xl">
        <div className="max-h-[78vh] space-y-6 overflow-y-auto px-1 pb-1">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-secondary">Nom de la vue</label>
            <input value={name} onChange={event => setName(event.target.value)} placeholder="Ex. Suivi des chantiers en cours" className="w-full rounded-xl border border-default bg-primary-bg px-3 py-2.5 text-sm outline-none focus:border-primary" autoFocus />
          </div>
          <div className="rounded-xl border border-default bg-secondary-bg px-4 py-3">
            <label className="flex cursor-pointer items-center justify-between">
              <span><span className="block text-sm font-semibold text-primary">Visibilité</span><span className="text-xs text-secondary">{isPrivate ? "Vous et les utilisateurs sélectionnés" : "Accessible à tous les utilisateurs autorisés"}</span></span>
              <span className="flex items-center gap-2 text-sm text-primary">{isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}<input type="checkbox" checked={isPrivate} onChange={event => setIsPrivate(event.target.checked)} /></span>
            </label>
            {isPrivate && <div className="mt-3 grid max-h-36 gap-1 overflow-y-auto border-t border-default pt-3 sm:grid-cols-2">
              {availableUsers.filter(user => user.Id !== userId).map(user => {
                const checked = selectedUsers.includes(user.Id);
                return <label key={user.Id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${checked ? "bg-primary/10 text-primary" : "text-secondary hover:bg-primary/5"}`}>
                  <input type="checkbox" checked={checked} onChange={() => setSelectedUsers(current => checked ? current.filter(id => id !== user.Id) : [...current, user.Id])} />
                  {user.Nom} {user.Prenom || ""}
                </label>;
              })}
              {!availableUsers.length && <span className="text-xs text-secondary">Aucun utilisateur disponible.</span>}
            </div>}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-primary">Colonnes affichées</h3><p className="text-xs text-secondary">Glissez les lignes pour modifier l'ordre.</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{columns.length} colonnes</span></div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-default p-2">
              {columns.map(id => {
                const column = allColumns.find(item => item.id === id);
                if (!column) return null;
                return <div key={id} onDragOver={event => { event.preventDefault(); setDragOverColumn(id); }} onDragLeave={() => setDragOverColumn(null)} onDrop={() => { moveColumn(id); setDragOverColumn(null); }} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm text-primary transition-all duration-200 ${dragOverColumn === id ? "border-primary bg-primary/10 translate-y-0.5 shadow-sm" : "border-transparent hover:bg-primary/5"}`}>
                  <button type="button" draggable onDragStart={() => setDraggedColumn(id)} onDragEnd={() => { setDraggedColumn(null); setDragOverColumn(null); }} className="cursor-grab rounded p-1 text-secondary active:cursor-grabbing" aria-label={`Déplacer ${column.label}`}><GripVertical className="h-4 w-4" /></button>
                  <span className="flex-1">{column.label}</span>
                  <button type="button" onClick={() => setColumns(current => current.filter(columnId => columnId !== id))} className="rounded p-1 text-secondary hover:bg-red-50 hover:text-red-600" aria-label={`Retirer ${column.label}`}><X className="h-4 w-4" /></button>
                </div>;
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {allColumns.filter(column => !columns.includes(column.id)).map(column => (
                <button key={column.id} type="button" onClick={() => setColumns(current => [...current, column.id])} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-default px-3 py-1.5 text-xs text-secondary transition hover:border-primary hover:bg-primary/5 hover:text-primary">
                  <Plus className="h-3.5 w-3.5" /> {column.label}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-default bg-secondary-bg p-4">
            <div className="mb-4 flex items-center justify-between"><span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary" /><span><span className="block text-sm font-semibold text-primary">Filtres de la vue</span><span className="text-xs text-secondary">Configurez-les directement ici</span></span></span><span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">{Object.keys(cleanFilters(filterDraft)).length}</span></div>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(keyOfFilter).map(([key, category]) => {
                const options = filterOptions[key] || [];
                const values = filterDraft[key] || [];
                return <div key={key} className="rounded-lg border border-default bg-primary-bg p-3">
                  <button type="button" onClick={() => setActiveFilterKey(activeFilterKey === key ? null : key)} className="flex w-full items-center justify-between text-left text-sm font-semibold text-primary"><span>{category.label}</span><span className="text-xs font-normal text-secondary">{values.length ? `${values.length} sélectionné(s)` : "Tous"}</span></button>
                  {(activeFilterKey === key || values.length > 0) && <div className="mt-3 max-h-36 space-y-1 overflow-y-auto">
                    {category.type === "select" ? <select value={values[0] || ""} onChange={event => setFilterDraft(current => ({ ...current, [key]: event.target.value ? [event.target.value] : [] }))} className="w-full rounded-lg border border-default bg-secondary-bg px-2 py-1.5 text-sm"><option value="">Tous</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> :
                      options.map(option => <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-secondary hover:bg-primary/5"><input type={category.type === "radio" ? "radio" : "checkbox"} name={key} checked={values.includes(option.value)} onChange={() => category.type === "radio" ? setFilterDraft(current => ({ ...current, [key]: [option.value] })) : toggleFilterValue(key, option.value)} /><span className="flex-1">{option.label}</span>{values.includes(option.value) && <Check className="h-3.5 w-3.5 text-primary" />}</label>)}
                    {!options.length && <span className="text-xs text-secondary">Aucune option disponible.</span>}
                  </div>}
                </div>;
              })}
            </div>
          </div>
          {columns.length === 0 && <p className="text-xs font-medium text-red-600">Sélectionnez au moins une colonne.</p>}
          <div className="flex justify-end gap-2 border-t border-default pt-4"><button type="button" disabled={isSaving} onClick={() => setIsEditorOpen(false)} className="rounded-xl px-4 py-2 text-sm text-secondary hover:bg-secondary-bg">Annuler</button><button type="button" disabled={isSaving || !name.trim()} onClick={() => void saveView()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer la vue</button></div>
        </div>
      </Modal>
    </>
  );
};

export default ChantierViewsControl;
