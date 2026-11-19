import { format, isBefore, startOfDay } from "date-fns";
import { Loader, normalizeColorForInput } from "../../ui";
import { DayType } from "@/app/calendrier/types";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { SaveAction } from "./SettingsModal";

const NewDayTypeForm = ({
  onAdd,
  setError,
}: {
  onAdd?: (newType: any) => Promise<{ success: boolean; message?: string }>;
  setError: (msg: string | null) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [Libelle, setLibelle] = useState("");
  const [CouleurFond, setCouleurFond] = useState("#2563eb");
  const [CouleurTexte, setCouleurTexte] = useState("#ffffff");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setLibelle("");
    setCouleurFond("#2563eb");
    setCouleurTexte("#ffffff");
    setIsBold(false);
    setIsItalic(false);
    setFormError(null);
  };

  const handleCreate = async () => {
    if (!Libelle.trim()) {
      setFormError("Le libellé est obligatoire.");
      return;
    }
    setFormError(null);
    setError(null);
    setIsSubmitting(true);

    try {
      if (onAdd) {
        const res = await onAdd({
          Libelle: Libelle.trim(),
          CouleurFond: normalizeColorForInput(CouleurFond),
          CouleurTexte: normalizeColorForInput(CouleurTexte),
          isBold: isBold,
          isItalic: isItalic,
        });

        if (res && res.success) {
          resetForm();
          setIsOpen(false);
        } else {
          setError(res?.message || "Erreur lors de la création du type de jour.");
        }
      }
    } catch (e: any) {
      setError(e?.message || "Une erreur inattendue est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium text-sm poppins flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] shadow-sm mb-4 cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Ajouter un type de jour
      </button>
    );
  }

  return (
    <div className="p-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col gap-4 shadow-sm mb-4">
      <div className="flex items-center justify-between pb-2 border-b border-primary/20">
        <h4 className="text-sm font-semibold text-primary poppins flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nouveau type de jour
        </h4>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsOpen(false);
          }}
          className="text-secondary hover:text-primary transition-colors p-1 cursor-pointer"
          title="Fermer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label htmlFor="newDayTypeLabel" className="text-xs text-secondary font-medium poppins">
              Libellé
            </label>
            <input
              id="newDayTypeLabel"
              type="text"
              value={Libelle}
              onChange={(e) => {
                setLibelle(e.target.value);
                if (formError) setFormError(null);
                setError(null);
              }}
              placeholder="Ex: Astreinte, Congé..."
              className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 poppins text-xs bg-primary-bg shadow-sm hover:shadow-md w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="new-color-fond-hex" className="text-xs text-secondary font-medium poppins">
              Couleur Fond
            </label>
            <div className="flex items-center gap-1.5 bg-primary-bg border border-default rounded-xl p-1 shadow-sm">
              <label
                htmlFor="new-color-fond"
                className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
                style={{ backgroundColor: normalizeColorForInput(CouleurFond) }}
                title="Choisir couleur de fond"
              />
              <input
                id="new-color-fond"
                type="color"
                value={normalizeColorForInput(CouleurFond)}
                onChange={(e) => setCouleurFond(e.target.value)}
                className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
              />
              <input
                id="new-color-fond-hex"
                type="text"
                value={CouleurFond}
                onChange={(e) => setCouleurFond(e.target.value)}
                placeholder="#2563EB"
                className="w-20 px-1 py-0.5 text-xs font-mono font-semibold text-primary uppercase focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="new-color-texte-hex" className="text-xs text-secondary font-medium poppins">
              Couleur Texte
            </label>
            <div className="flex items-center gap-1.5 bg-primary-bg border border-default rounded-xl p-1 shadow-sm">
              <label
                htmlFor="new-color-texte"
                className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
                style={{ backgroundColor: normalizeColorForInput(CouleurTexte, "#FFFFFF") }}
                title="Choisir couleur de texte"
              />
              <input
                id="new-color-texte"
                type="color"
                value={normalizeColorForInput(CouleurTexte, "#FFFFFF")}
                onChange={(e) => setCouleurTexte(e.target.value)}
                className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
              />
              <input
                id="new-color-texte-hex"
                type="text"
                value={CouleurTexte}
                onChange={(e) => setCouleurTexte(e.target.value)}
                placeholder="#FFFFFF"
                className="w-20 px-1 py-0.5 text-xs font-mono font-semibold text-primary uppercase focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-secondary font-medium poppins">Style</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsBold((prev) => !prev)}
                title="Gras"
                className={`h-9 px-3.5 rounded-xl border text-sm font-black poppins transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                  isBold
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-primary-bg text-primary border-light hover:bg-secondary/10"
                }`}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => setIsItalic((prev) => !prev)}
                title="Italique"
                className={`h-9 px-3.5 rounded-xl border text-sm italic font-serif transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                  isItalic
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-primary-bg text-primary border-light hover:bg-secondary/10"
                }`}
              >
                I
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-secondary font-medium poppins">Aperçu</span>
            <div className="w-12 h-12 border border-light rounded-xl overflow-hidden shrink-0 shadow-sm bg-primary-bg">
              <div
                className="flex flex-col justify-center items-center h-full w-full text-center relative transition-all p-1"
                style={{
                  backgroundColor: normalizeColorForInput(CouleurFond, "#2563eb"),
                  color: normalizeColorForInput(CouleurTexte, "#ffffff"),
                  fontWeight: isBold ? "700" : "400",
                  fontStyle: isItalic ? "italic" : "normal",
                }}
              >
                <span className="block text-sm leading-none font-semibold">14</span>
                <span className="block text-[9px] opacity-80 uppercase tracking-wider mt-0.5">Lun.</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            <span className="text-xs font-medium poppins opacity-0 pointer-events-none select-none hidden sm:block">
              Action
            </span>
            <div className="flex items-center h-full">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                title="Valider la création"
                className="cursor-pointer bg-primary text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {formError && <p className="text-xs text-red-500 font-medium poppins">{formError}</p>}
    </div>
  );
};

const DayTypeSingleEditor = ({
  dayType,
  isSelected,
  onSelect,
  onUpdate,
  onCheckDelete,
  onDelete,
  setError,
  canDelete,
  canEdit,
  registerSaveAction,
}: {
  dayType: DayType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate?: (updated: any) => Promise<{ success: boolean; message?: string }>;
  onCheckDelete?: (id: number | string) => Promise<{ checkRequired: boolean; message?: string }>;
  onDelete?: (id: number | string, count: number) => Promise<{ success: boolean; message?: string }>;
  setError: (msg: string | null) => void;
  canDelete: boolean;
  canEdit: boolean;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}) => {
  const [localType, setLocalType] = useState(dayType);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    checkRequired: boolean;
    message: string;
    expectedCount: number | null;
  }>({
    isOpen: false,
    checkRequired: false,
    message: "",
    expectedCount: null,
  });

  const [confirmInput, setConfirmInput] = useState<string>("");

  useEffect(() => {
    setLocalType(dayType);
  }, [dayType]);

  const isDirty =
    localType.Libelle !== dayType.Libelle ||
    localType.CouleurFond !== dayType.CouleurFond ||
    localType.CouleurTexte !== dayType.CouleurTexte ||
    localType.isBold !== dayType.isBold ||
    localType.isItalic !== dayType.isItalic;

  const handleLabelChange = (value: string) => {
    setLocalType((prev: any) => ({ ...prev, Libelle: value }));
    setError(null);
  };

  const handleColorChange = (key: "CouleurFond" | "CouleurTexte", value: string) => {
    setLocalType((prev: any) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleToggle = (key: "isBold" | "isItalic") => {
    setLocalType((prev: any) => ({ ...prev, [key]: !prev[key] }));
    setError(null);
  };

  const handleSave = useCallback(async () => {
    if (!onUpdate || !canEdit) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await onUpdate({
        ...localType,
        CouleurFond: normalizeColorForInput(localType.CouleurFond),
        CouleurTexte: normalizeColorForInput(localType.CouleurTexte),
      });
      if (res && !res.success) {
        setError(res?.message || "Erreur lors de la mise à jour.");
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la mise à jour.");
    } finally {
      setIsSaving(false);
    }
  }, [onUpdate, canEdit, localType, setError]);

  const handleInitiateDelete = async () => {
    if (!canDelete) return;
    setError(null);
    setConfirmInput("");

    if (!onCheckDelete) {
      setDeleteModalState({
        isOpen: true,
        checkRequired: false,
        message: "",
        expectedCount: null,
      });
      return;
    }

    setIsCheckingDelete(true);

    try {
      const res = await onCheckDelete(dayType.Id);

      let parsedCount: number | null = null;
      if (res.checkRequired && res.message) {
        const match = res.message.match(/\d+/);
        if (match) {
          parsedCount = parseInt(match[0], 10);
        }
      }

      setDeleteModalState({
        isOpen: true,
        checkRequired: res.checkRequired,
        message: res.message || "",
        expectedCount: parsedCount,
      });
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la vérification de la suppression.");
    } finally {
      setIsCheckingDelete(false);
    }
  };

  const confirmDelete = async () => {
    if (!onDelete || !canDelete) return;

    const countToSend = deleteModalState.checkRequired ? parseInt(confirmInput, 10) || 0 : 0;

    setDeleteModalState((prev) => ({ ...prev, isOpen: false }));
    setIsDeleting(true);
    setError(null);

    try {
      const res = await onDelete(dayType.Id, countToSend);
      if (res && !res.success) {
        setError(res?.message || "Erreur lors de la suppression.");
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmDisabled =
    deleteModalState.checkRequired &&
    (deleteModalState.expectedCount !== null
      ? parseInt(confirmInput.trim(), 10) !== deleteModalState.expectedCount
      : !confirmInput.trim());

  useEffect(() => {
    const actionId = `day-type-${dayType.Id}`;
    registerSaveAction(actionId, { isDirty, save: handleSave });
    return () => registerSaveAction(actionId, null);
  }, [dayType.Id, isDirty, handleSave, registerSaveAction]);

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-wrap items-center justify-between gap-3 shadow-sm relative ${
        isSelected ? "border-primary bg-primary/10 " : "border-light bg-secondary/10 hover:border-primary/30"
      }`}
    >
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-primary-bg p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3 text-red-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <h5 className="font-semibold text-sm text-primary poppins">Supprimer le type de jour ?</h5>
            </div>

            {deleteModalState.checkRequired ? (
              <div className="space-y-3">
                <p className="text-xs text-secondary leading-relaxed poppins font-medium">{deleteModalState.message}</p>
                <div className="space-y-1">
                  <label htmlFor={`confirmInput-${dayType.Id}`} className="text-[11px] text-secondary font-semibold poppins">
                    Veuillez saisir le nombre de jour(s) pour confirmer :
                  </label>
                  <input
                    id={`confirmInput-${dayType.Id}`}
                    type="number"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder={
                      deleteModalState.expectedCount !== null
                        ? `Entrez ${deleteModalState.expectedCount}`
                        : "Nombre de jours"
                    }
                    className="w-full border border-default rounded-xl px-3 py-1.5 text-xs bg-primary-bg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-secondary leading-relaxed poppins">
                Êtes-vous sûr de vouloir supprimer le type de jour{" "}
                <strong className="text-primary">{dayType.Libelle}</strong> ? Cette action est irréversible.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-light text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer poppins"
                onClick={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isConfirmDisabled}
                className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer poppins"
                onClick={confirmDelete}
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label htmlFor={`dayTypeLabelInput-${dayType.Id}`} className="text-xs text-secondary font-medium poppins">
            Libellé
          </label>
          <input
            id={`dayTypeLabelInput-${dayType.Id}`}
            type="text"
            value={localType.Libelle || ""}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Ex: Jour Férié..."
            className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 poppins text-xs bg-primary-bg shadow-sm hover:shadow-md w-full"
            disabled={dayType.isLocked || !canEdit}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Couleur Fond</span>
          <div className="flex items-center gap-1.5 bg-primary-bg border border-default rounded-xl p-1 shadow-sm">
            <label
              htmlFor={`color-fond-${dayType.Id}`}
              className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
              style={{ backgroundColor: normalizeColorForInput(localType.CouleurFond, "#1E40AF") }}
              title="Changer couleur de fond"
            />
            <input
              id={`color-fond-${dayType.Id}`}
              type="color"
              value={normalizeColorForInput(localType.CouleurFond)}
              onChange={(e) => handleColorChange("CouleurFond", e.target.value)}
              className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
              disabled={!canEdit}
            />
            <input
              type="text"
              value={localType.CouleurFond || ""}
              onChange={(e) => handleColorChange("CouleurFond", e.target.value)}
              placeholder="#1E40AF"
              className="w-20 px-1 py-0.5 text-xs font-mono font-semibold text-primary uppercase focus:outline-none bg-transparent"
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Couleur Texte</span>
          <div className="flex items-center gap-1.5 bg-primary-bg border border-default rounded-xl p-1 shadow-sm">
            <label
              htmlFor={`color-texte-${dayType.Id}`}
              className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
              style={{ backgroundColor: normalizeColorForInput(localType.CouleurTexte, "#FFFFFF") }}
              title="Changer couleur de texte"
            />
            <input
              id={`color-texte-${dayType.Id}`}
              type="color"
              value={normalizeColorForInput(localType.CouleurTexte, "#FFFFFF")}
              onChange={(e) => handleColorChange("CouleurTexte", e.target.value)}
              className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
              disabled={!canEdit}
            />
            <input
              type="text"
              value={localType.CouleurTexte || ""}
              onChange={(e) => handleColorChange("CouleurTexte", e.target.value)}
              placeholder="#FFFFFF"
              className="w-20 px-1 py-0.5 text-xs font-mono font-semibold text-primary uppercase focus:outline-none bg-transparent"
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Style</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleToggle("isBold")}
              title="Gras"
              className={`${
                !canEdit ? "opacity-50 cursor-not-allowed" : ""
              } h-9 px-3.5 rounded-xl border text-sm font-black poppins transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                localType.isBold
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-primary-bg text-primary border-light hover:bg-secondary/10"
              }`}
              disabled={!canEdit}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => handleToggle("isItalic")}
              title="Italique"
              className={` ${
                !canEdit ? "opacity-50 cursor-not-allowed" : ""
              } h-9 px-3.5 rounded-xl border text-sm italic font-serif transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                localType.isItalic
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-primary-bg text-primary border-light hover:bg-secondary/10"
              }`}
              disabled={!canEdit}
            >
              I
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Aperçu</span>
          <div className="w-12 h-12 border border-light rounded-xl overflow-hidden shrink-0 shadow-sm bg-primary-bg">
            <div
              className="flex flex-col justify-center items-center h-full w-full text-center relative transition-all p-1"
              style={{
                backgroundColor: normalizeColorForInput(localType.CouleurFond, "#1E40AF"),
                color: normalizeColorForInput(localType.CouleurTexte, "#FFFFFF"),
                fontWeight: localType.isBold ? "700" : "400",
                fontStyle: localType.isItalic ? "italic" : "normal",
              }}
            >
              <span className="block text-xs leading-none font-semibold">14</span>
              <span className="block text-[9px] opacity-80 uppercase tracking-wider mt-0.5">Lun.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        <span className="text-xs font-medium poppins opacity-0 pointer-events-none select-none hidden sm:block">
          Actions
        </span>

        <div className="flex items-center gap-2 h-full">
          {isDirty && canEdit ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              title="Enregistrer les modifications"
              className="cursor-pointer bg-primary text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ) : !dayType.isLocked || canDelete ? (
            <button
              type="button"
              onClick={handleInitiateDelete}
              disabled={isDeleting || isCheckingDelete}
              title="Supprimer ce type de jour"
              className="cursor-pointer bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
            >
              {isDeleting || isCheckingDelete ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onSelect}
            className={`px-3 py-2 rounded-xl text-xs font-semibold poppins transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
              isSelected
                ? "bg-primary text-white ring-2 ring-primary/20"
                : "bg-primary-bg border border-light hover:bg-primary/5 text-primary"
            }`}
          >
            <span>Voir les jours</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const NonWorkingDaysEditor = ({
  setting,
  selectedDayTypeId,
  setSelectedDayTypeId,
  canEdit,
  canDelete,
  canAdd,
}: {
  setting: any;
  selectedDayTypeId: string | null;
  setSelectedDayTypeId: (id: string | null) => void;
  canEdit: boolean;
  canDelete: boolean;
  canAdd: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYearsState, setAvailableYearsState] = useState<number[]>([]);
  const [newDate, setNewDate] = useState<string>("");
  const [newTypeId, setNewTypeId] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingYear, setIsLoadingYear] = useState(false);
  const [deletingDates, setDeletingDates] = useState<Record<string, boolean>>({});
  const [dateErrorMessage, setDateErrorMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pendingDeleteDate, setPendingDeleteDate] = useState<{
    dateKey: string;
    id: number | string;
    formattedDate: string;
  } | null>(null);

  const [hasInteracted, setHasInteracted] = useState<boolean>(Boolean(selectedDayTypeId));
  const [filterType, setFilterType] = useState<string>(selectedDayTypeId || "all");

  useEffect(() => {
    if (selectedDayTypeId) {
      setHasInteracted(true);
      setFilterType(selectedDayTypeId);
      if (selectedDayTypeId !== "all") {
        setNewTypeId(selectedDayTypeId);
      }
    }
  }, [selectedDayTypeId]);

  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>("");
  const [editTypeIdValue, setEditTypeIdValue] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [pendingPastDateAction, setPendingPastDateAction] = useState<{
    type: "add" | "edit";
    dateStr: string;
    typeId: string;
    originalKey?: string;
    originalVal?: any;
  } | null>(null);

  const settingRef = useRef(setting);
  useEffect(() => {
    settingRef.current = setting;
  }, [setting]);

  useEffect(() => {
    const fetchYears = settingRef.current.getAvailablesYearForNonWorkingDate || settingRef.current.fetchAvailableYears;
    if (typeof fetchYears === "function") {
      fetchYears()
        .then((res: any) => {
          if (Array.isArray(res)) {
            setAvailableYearsState(res);
          } else if (res && res.success && Array.isArray(res.data)) {
            setAvailableYearsState(res.data);
          }
        })
        .catch(() => {});
    }
  }, []);

  const availableYears: number[] = useMemo(() => {
    if (availableYearsState.length > 0) return availableYearsState;
    if (setting.availableYears && setting.availableYears.length > 0) {
      return setting.availableYears;
    }
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, [availableYearsState, setting.availableYears]);

  useEffect(() => {
    const currentSetting = settingRef.current;
    const fetchDays = currentSetting.fetchNonWorkingDays || currentSetting.fetchNonWorkingDates;

    if (typeof fetchDays === "function") {
      setIsLoadingYear(true);
      setError(null);

      fetchDays(selectedYear)
        .then((res: any) => {
          if (res && !res.success && res.message) {
            setError(res.message);
          }
          if (res && res.data) {
            const nonWorkingDates = res.data.nonWorkingDates || [];
            const recordData = Object.fromEntries(
              nonWorkingDates.map(
                (item: { DatePlanningJourNontravaille: any; IdPlanningJourNontravaille: string; TypeJourCode: string }) => [
                  item.DatePlanningJourNontravaille,
                  { Id: Number(item.IdPlanningJourNontravaille), TypeJourCode: item.TypeJourCode },
                ]
              )
            );
            currentSetting.setNonWorkingDates(recordData);
          }
        })
        .catch((err: any) => {
          setError(err?.message || "Erreur lors de la récupération des jours.");
        })
        .finally(() => {
          setIsLoadingYear(false);
        });
    }
  }, [selectedYear, setError]);

  const filteredDates = useMemo(() => {
    const dates = setting.nonWorkingDates || {};
    return Object.entries(dates).filter(([dateKey, val]: [string, any]) => {
      const year = new Date(dateKey).getFullYear();
      const itemObj = typeof val === "object" ? val : { TypeJourCode: val };

      const matchYear = year === Number(selectedYear);
      const matchType = filterType === "all" || String(itemObj.TypeJourCode) === String(filterType);

      return matchYear && matchType;
    });
  }, [setting.nonWorkingDates, selectedYear, filterType]);

  const resetForm = () => {
    setNewDate("");
    setDateErrorMessage(null);
  };

  const executeAddDate = async (dateStr: string, typeId: string) => {
    if (!canAdd) return;
    const formattedInputDate = format(new Date(dateStr), "yyyy-MM-dd");

    setDateErrorMessage(null);
    setError(null);
    setIsAdding(true);

    const parsedDate = new Date(dateStr).getTime();

    try {
      if (setting.addNonWorkingDatesToPlanning) {
        const response = await setting.addNonWorkingDatesToPlanning(parsedDate, typeId);
        if (response && response.success && response.data) {
          setting.setNonWorkingDates((prev: any) => {
            const updated = {
              ...prev,
              [formattedInputDate]: {
                Id: Number(response.data),
                TypeJourCode: typeId,
              },
            };

            const sortedKeys = Object.keys(updated).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

            return sortedKeys.reduce((acc: Record<string, any>, key) => {
              acc[key] = updated[key];
              return acc;
            }, {});
          });
          setAvailableYearsState((prev) => {
            const yearToAdd = new Date(dateStr).getFullYear();
            if (!prev.includes(yearToAdd)) {
              return [...prev, yearToAdd].sort((a, b) => a - b);
            }
            return prev;
          });
          resetForm();
          setIsOpen(false);
        } else {
          setError(response?.message || "Erreur lors de l'ajout de la date.");
        }
      }
    } catch (error: any) {
      setError(error?.message || "Erreur réseau lors de l'ajout de la date.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddDate = async () => {
    if (!canAdd) return;

    if (!newDate) {
      setDateErrorMessage("Veuillez choisir une date.");
      return;
    }

    const selectedTypeForAdd =
      newTypeId || (selectedDayTypeId !== "all" ? selectedDayTypeId : null) || setting.dayTypesOptions?.[0]?.Id;

    if (!selectedTypeForAdd) {
      setDateErrorMessage("Veuillez choisir un type de jour.");
      return;
    }

    const formattedInputDate = format(new Date(newDate), "yyyy-MM-dd");

    if (setting.nonWorkingDates && setting.nonWorkingDates[formattedInputDate]) {
      setDateErrorMessage(
        `Un jour non travaillé existe déjà à cette date (${
          setting.dayTypesOptions.find((t: any) => t.Id === setting.nonWorkingDates[formattedInputDate].TypeJourCode)
            ?.Libelle || "Inconnu"
        }).`
      );
      return;
    }

    const inputDateStart = startOfDay(new Date(newDate));
    const todayStart = startOfDay(new Date());

    if (isBefore(inputDateStart, todayStart)) {
      setPendingPastDateAction({
        type: "add",
        dateStr: newDate,
        typeId: String(selectedTypeForAdd),
      });
      return;
    }

    await executeAddDate(newDate, String(selectedTypeForAdd));
  };

  const handleStartEdit = (dateKey: string, currentVal: any) => {
    if (!canEdit) return;

    const itemObj = typeof currentVal === "object" ? currentVal : { TypeJourCode: currentVal };
    setEditingDateKey(dateKey);
    setEditDateValue(dateKey);
    setEditTypeIdValue(
      String(
        itemObj.TypeJourCode ||
          (selectedDayTypeId !== "all" ? selectedDayTypeId : null) ||
          setting.dayTypesOptions?.[0]?.Id ||
          ""
      )
    );
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingDateKey(null);
    setEditDateValue("");
    setEditTypeIdValue("");
  };

  const executeSaveEdit = async (
    originalDateKey: string,
    originalVal: any,
    newDateValueStr: string,
    newTypeIdStr: string
  ) => {
    if (!canEdit) return;

    const formattedNewDate = format(new Date(newDateValueStr), "yyyy-MM-dd");
    const itemObj = typeof originalVal === "object" ? originalVal : { id: originalVal };
    const dateId = itemObj.Id || itemObj.id;

    setIsSavingEdit(true);
    setError(null);

    try {
      if (setting.updateNonWorkingDate) {
        const response = await setting.updateNonWorkingDate({
          id: dateId,
          date: new Date(newDateValueStr),
          typeJourCode: newTypeIdStr,
        });

        if (!response || !response.success) {
          setError(response?.message || "Erreur lors de la modification du jour.");
          setIsSavingEdit(false);
          return;
        }
      }

      setting.setNonWorkingDates((prev: any) => {
        const updated = { ...prev };
        delete updated[originalDateKey];

        updated[formattedNewDate] = {
          Id: dateId,
          TypeJourCode: newTypeIdStr,
        };

        const sortedKeys = Object.keys(updated).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        return sortedKeys.reduce((acc: Record<string, any>, key) => {
          acc[key] = updated[key];
          return acc;
        }, {});
      });

      handleCancelEdit();
    } catch (error: any) {
      setError(error?.message || "Erreur lors de la mise à jour du jour.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveEdit = async (originalDateKey: string, originalVal: any) => {
    if (!editDateValue || !editTypeIdValue || !canEdit) return;

    const formattedNewDate = format(new Date(editDateValue), "yyyy-MM-dd");

    if (formattedNewDate !== originalDateKey && setting.nonWorkingDates?.[formattedNewDate]) {
      setError(
        `Un jour non travaillé existe déjà à cette date (${
          setting.dayTypesOptions.find((t: any) => t.Id === setting.nonWorkingDates[formattedNewDate].TypeJourCode)
            ?.Libelle || "Inconnu"
        }).`
      );
      return;
    }

    const inputDateStart = startOfDay(new Date(editDateValue));
    const todayStart = startOfDay(new Date());

    if (isBefore(inputDateStart, todayStart)) {
      setPendingPastDateAction({
        type: "edit",
        dateStr: editDateValue,
        typeId: editTypeIdValue,
        originalKey: originalDateKey,
        originalVal: originalVal,
      });
      return;
    }

    await executeSaveEdit(originalDateKey, originalVal, editDateValue, editTypeIdValue);
  };

  const executeDeleteDate = async (dateKey: string, dateId: number | string) => {
    if (!canDelete) return;

    setDeletingDates((prev) => ({ ...prev, [dateKey]: true }));
    setError(null);

    try {
      if (setting.removeNonWorkingDatesFromPlanning) {
        const response = await setting.removeNonWorkingDatesFromPlanning(dateId);
        if (response && response.success) {
          setting.setNonWorkingDates((prev: any) => {
            const newDates = { ...prev };
            delete newDates[dateKey];
            return newDates;
          });
        } else {
          setError(response?.message || "Erreur lors de la suppression.");
        }
      } else {
        setting.setNonWorkingDates((prev: any) => {
          const newDates = { ...prev };
          delete newDates[dateKey];
          return newDates;
        });
      }
    } catch (error: any) {
      setError(error?.message || "Erreur lors de la suppression.");
    } finally {
      setDeletingDates((prev) => {
        const next = { ...prev };
        delete next[dateKey];
        return next;
      });
    }
  };

  const getDayTypeColor = (typeCode: string) => {
    const dt = setting.dayTypesOptions?.find((item: any) => String(item.Id) === String(typeCode));
    return normalizeColorForInput(dt?.CouleurFond, "#2563eb");
  };

  if (!hasInteracted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-primary-bg/40 rounded-2xl border border-dashed border-light min-h-[300px]">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-primary poppins">Aucun type de jour sélectionné</p>
        <p className="text-xs text-secondary/80 mt-1 max-w-xs poppins leading-relaxed">
          Veuillez cliquer sur <span className="font-semibold text-primary">« Voir les jours »</span> sur un type de
          jour à gauche pour afficher et gérer ses jours configurés.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full min-h-0 relative">
      <h4 className="text-sm font-semibold text-primary pb-2 border-b border-ultra-light">Jours enregistrés</h4>

      {pendingDeleteDate && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 rounded-xl">
          <div className="bg-primary-bg p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3 text-red-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <h5 className="font-semibold text-sm text-primary poppins">Supprimer ce jour ?</h5>
            </div>
            <p className="text-xs text-secondary leading-relaxed poppins">
              Êtes-vous sûr de vouloir supprimer la date du{" "}
              <strong className="text-primary">{pendingDeleteDate.formattedDate}</strong> ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-light text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer poppins"
                onClick={() => setPendingDeleteDate(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer poppins"
                onClick={async () => {
                  const target = pendingDeleteDate;
                  setPendingDeleteDate(null);
                  await executeDeleteDate(target.dateKey, target.id);
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingPastDateAction && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 rounded-xl">
          <div className="bg-primary-bg p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h5 className="font-semibold text-sm text-primary">Date antérieure détectée</h5>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              La date choisie (<strong>{format(new Date(pendingPastDateAction.dateStr), "dd/MM/yyyy")}</strong>) est
              antérieure à aujourd&apos;hui. Souhaitez-vous vraiment continuer ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-light text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                onClick={() => setPendingPastDateAction(null)}
              >
                Non
              </button>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-600 shadow-sm transition-colors cursor-pointer"
                onClick={async () => {
                  const action = pendingPastDateAction;
                  setPendingPastDateAction(null);
                  if (action.type === "add") {
                    await executeAddDate(action.dateStr, action.typeId);
                  } else if (action.type === "edit" && action.originalKey) {
                    await executeSaveEdit(action.originalKey, action.originalVal, action.dateStr, action.typeId);
                  }
                }}
              >
                Oui, confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 bg-primary-bg p-3 rounded-xl border border-light shadow-sm">
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-semibold text-secondary whitespace-nowrap">Année :</span>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            disabled={isLoadingYear}
            className="border border-default rounded-xl px-3 py-1.5 text-xs bg-primary-bg font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm disabled:opacity-50"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {canAdd &&
        (!isOpen ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setDateErrorMessage(null);
              setIsOpen(true);
            }}
            className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajouter une date
          </button>
        ) : (
          <div className="p-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col gap-2.5 shadow-sm shrink-0">
            <div className="flex items-center justify-between pb-1 border-b border-primary/20">
              <h5 className="text-xs font-semibold text-primary">Nouveau jour</h5>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsOpen(false);
                }}
                className="text-secondary hover:text-primary transition-colors p-0.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  if (dateErrorMessage) setDateErrorMessage(null);
                }}
                className="border border-default rounded-lg px-2.5 py-1.5 text-xs bg-primary-bg shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none"
              />

              <select
                value={
                  newTypeId ||
                  (selectedDayTypeId !== "all" ? selectedDayTypeId : null) ||
                  setting.dayTypesOptions?.[0]?.Id ||
                  ""
                }
                onChange={(e) => setNewTypeId(e.target.value)}
                className="border border-default rounded-lg px-2.5 py-1.5 text-xs bg-primary-bg shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none truncate"
              >
                {setting.dayTypesOptions?.map((dt: any) => (
                  <option key={dt.Id} value={dt.Id}>
                    {dt.Libelle}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAddDate}
                disabled={isAdding}
                className="px-3 py-1.5 cursor-pointer bg-primary text-white rounded-lg font-medium text-xs shadow-md hover:shadow-lg flex items-center justify-center gap-1 shrink-0 disabled:opacity-50 min-w-[70px]"
              >
                {isAdding ? (
                  <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  "Valider"
                )}
              </button>
            </div>

            {dateErrorMessage && <p className="text-[11px] text-red-500 font-medium">{dateErrorMessage}</p>}
            {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
          </div>
        ))}

      <div className="bg-primary-bg/60 rounded-xl p-3 min-h-[160px] relative flex-1 min-h-0 border border-light overflow-y-auto">
        {isLoadingYear ? (
          <div className="py-8">
            <Loader size="md" message={`Chargement...`} />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDates.length > 0 ? (
              filteredDates.map(([dateKey, val]: [string, any]) => {
                const itemObj = typeof val === "object" ? val : { id: val, TypeJourCode: selectedDayTypeId };
                const isEditingThisDate = editingDateKey === dateKey;

                if (isEditingThisDate) {
                  return (
                    <div
                      key={dateKey}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-primary/10 rounded-xl p-2.5 shadow-sm border border-primary/30 gap-2"
                    >
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="date"
                          value={editDateValue}
                          onChange={(e) => setEditDateValue(e.target.value)}
                          className="border border-default rounded-lg px-2 py-1 text-xs bg-primary-bg shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none"
                        />

                        <select
                          value={editTypeIdValue}
                          onChange={(e) => setEditTypeIdValue(e.target.value)}
                          className="border border-default rounded-lg px-2 py-1 text-xs bg-primary-bg shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none truncate"
                        >
                          {setting.dayTypesOptions?.map((dt: any) => (
                            <option key={dt.Id} value={dt.Id}>
                              {dt.Libelle}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 justify-end">
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={() => handleSaveEdit(dateKey, val)}
                          title="Enregistrer"
                          className="text-white bg-primary p-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={handleCancelEdit}
                          title="Annuler"
                          className="text-secondary bg-primary-bg p-1.5 rounded-lg border border-light transition-all cursor-pointer shadow-xs hover:bg-secondary/10"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                }

                const dateObj = new Date(dateKey);
                const isDeletingThisDate = Boolean(deletingDates[dateKey]);
                const currentTypeColor = getDayTypeColor(itemObj.TypeJourCode);
                const currentTypeObj = setting.dayTypesOptions?.find(
                  (dt: any) => String(dt.Id) === String(itemObj.TypeJourCode)
                );
                const formattedDateStr = format(dateObj, "dd/MM/yyyy");

                return (
                  <div
                    key={dateKey}
                    className="flex items-center justify-between bg-primary-bg rounded-lg p-2.5 shadow-sm border border-light hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: currentTypeColor }}
                        title={currentTypeObj?.Libelle || `Type ID: ${itemObj.TypeJourCode}`}
                      />
                      <span className="text-xs font-medium text-primary">{formattedDateStr}</span>
                      {currentTypeObj && (
                        <span className="text-[10px] text-secondary/70 bg-secondary-bg px-2 py-0.5 rounded-full border border-ultra-light">
                          {currentTypeObj.Libelle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit && (
                        <button
                          type="button"
                          className={
                            "text-secondary hover:text-primary p-1 rounded transition-all cursor-pointer" +
                            (isDeletingThisDate || !canEdit ? " disabled" : "")
                          }
                          title="Modifier le jour (date et type)"
                          onClick={() => handleStartEdit(dateKey, val)}
                          disabled={isDeletingThisDate || !canEdit}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          className={
                            "text-red-400 hover:text-red-600 p-1 rounded transition-all cursor-pointer disabled:opacity-50" +
                            (isDeletingThisDate || !canDelete ? " disabled" : "")
                          }
                          disabled={isDeletingThisDate || !canDelete}
                          title="Supprimer"
                          onClick={() => {
                            setPendingDeleteDate({
                              dateKey,
                              id: itemObj.Id || itemObj.id,
                              formattedDate: formattedDateStr,
                            });
                          }}
                        >
                          {isDeletingThisDate ? (
                            <svg className="animate-spin w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-secondary italic text-center py-4">
                Aucun jour configuré pour cette sélection en {selectedYear}.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};




export const DaysManagementCategoryContent: React.FC<{
  categoryObj: any;
  selectedDayTypeId: string | null;
  setSelectedDayTypeId: (id: string | null) => void;
  setApiError: (err: string | null) => void;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}> = ({
  categoryObj,
  selectedDayTypeId,
  setSelectedDayTypeId,
  setApiError,
  registerSaveAction,
}) => {
  const dayTypeSetting = categoryObj.items?.find((item: any) => item.type === "day-type-settings");
  const nonWorkingSetting = categoryObj.items?.find((item: any) => item.type === "custom-non-working-dates");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
      {/* PANNEAU GAUCHE : Types de jours */}
      <div className="lg:col-span-7 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
        <h4 className="text-sm font-semibold text-primary pb-2 border-b border-ultra-light">
          Types de jours
        </h4>

        {dayTypeSetting?.canAdd && (
          <NewDayTypeForm onAdd={dayTypeSetting.onAddDayType} setError={setApiError} />
        )}

        <div className="space-y-3">
          <div
            className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 shadow-sm cursor-pointer ${
              selectedDayTypeId === "all"
                ? "border-primary bg-primary/10"
                : "border-light bg-secondary/10 hover:border-primary/30"
            }`}
            onClick={() => setSelectedDayTypeId("all")}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </div>
              <span className="text-xs font-semibold text-primary poppins">Tous les types</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDayTypeId("all");
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold poppins transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                selectedDayTypeId === "all"
                  ? "bg-primary text-white ring-2 ring-primary/20"
                  : "bg-primary-bg border border-light hover:bg-primary/5 text-primary"
              }`}
            >
              <span>Voir les jours</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {dayTypeSetting?.dayTypes?.map((dayType: DayType) => (
            <DayTypeSingleEditor
              key={dayType.Id}
              dayType={dayType}
              isSelected={String(dayType.Id) === String(selectedDayTypeId)}
              onSelect={() => setSelectedDayTypeId(String(dayType.Id))}
              onUpdate={dayTypeSetting.onUpdateDayType}
              onCheckDelete={dayTypeSetting.onCheckDeleteDayType}
              onDelete={async (id: string | number, count: number) => {
                const result = await dayTypeSetting.onDeleteDayType?.(id, count);
                if (result?.success) {
                  setSelectedDayTypeId("all");
                }
                return result;
              }}
              setError={setApiError}
              canEdit={dayTypeSetting.canEdit}
              canDelete={dayTypeSetting.canDelete}
              registerSaveAction={registerSaveAction}
            />
          ))}
        </div>
      </div>

      {/* PANNEAU DROIT : Dates non travaillées */}
      <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-ultra-light pt-6 lg:pt-0 lg:pl-6 flex flex-col min-h-0 overflow-y-auto">
        {nonWorkingSetting ? (
          <NonWorkingDaysEditor
            setting={nonWorkingSetting}
            selectedDayTypeId={selectedDayTypeId}
            setSelectedDayTypeId={setSelectedDayTypeId}
            canAdd={nonWorkingSetting.canAdd}
            canEdit={nonWorkingSetting.canEdit}
            canDelete={nonWorkingSetting.canDelete}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-primary-bg/40 rounded-xl border border-dashed border-light min-h-[250px]">
            <p className="text-sm font-medium text-secondary poppins">Aucune donnée de configuration</p>
          </div>
        )}
      </div>
    </div>
  );
};