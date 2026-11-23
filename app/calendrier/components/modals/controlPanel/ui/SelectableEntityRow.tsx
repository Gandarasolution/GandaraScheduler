import React, { useState, useEffect, useCallback, useRef } from "react";
import { SaveAction } from "../ControlPanelModal"; // Adaptez le chemin si nécessaire

export interface SelectableEntityRowProps {
  actionId: string;
  isSelected: boolean;
  isDirty: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isLocked?: boolean;
  selectButtonLabel: string;
  deleteModalTitle: string;
  deleteModalDescription: React.ReactNode;
  confirmCountLabel?: string;
  onSelect: () => void;
  onSave: () => Promise<unknown> | void;
  onCheckDelete?: () => Promise<{ checkRequired: boolean; message?: string }>;
  onDelete?: (count: number) => Promise<unknown> | void;
  setError: (msg: string | null) => void;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
  children: React.ReactNode;
}

export const SelectableEntityRow: React.FC<SelectableEntityRowProps> = ({
  actionId,
  isSelected,
  isDirty,
  canEdit,
  canDelete,
  isLocked = false,
  selectButtonLabel,
  deleteModalTitle,
  deleteModalDescription,
  confirmCountLabel,
  onSelect,
  onSave,
  onCheckDelete,
  onDelete,
  setError,
  registerSaveAction,
  children,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleteModal, setDeleteModal] = useState<{
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

  // Stabilise la référence de onSave pour éviter toute boucle de re-render dans useEffect
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const handleSave = useCallback(async () => {
    if (!canEdit) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSaveRef.current();
    } finally {
      setIsSaving(false);
    }
  }, [canEdit, setError]);

  useEffect(() => {
    registerSaveAction(actionId, { isDirty, save: handleSave });
    return () => registerSaveAction(actionId, null);
  }, [actionId, isDirty, handleSave, registerSaveAction]);

  const handleInitiateDelete = async () => {
    if (!canDelete) return;
    setError(null);
    setConfirmInput("");

    if (!onCheckDelete) {
      setDeleteModal({
        isOpen: true,
        checkRequired: false,
        message: "",
        expectedCount: null,
      });
      return;
    }

    setIsCheckingDelete(true);
    try {
      const res = await onCheckDelete();

      console.log("onCheckDelete result:", res); // Ajout du log pour débogage
      const match = res.checkRequired && res.message ? res.message.match(/\d+/) : null;
      setDeleteModal({
        isOpen: true,
        checkRequired: res.checkRequired,
        message: res.message || "",
        expectedCount: match ? parseInt(match[0], 10) : null,
      });
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la vérification de la suppression.");
    } finally {
      setIsCheckingDelete(false);
    }
  };

  const confirmDelete = async () => {
    if (!onDelete || !canDelete) return;
    const countToSend = deleteModal.checkRequired ? parseInt(confirmInput, 10) || 0 : 0;
    setDeleteModal((prev) => ({ ...prev, isOpen: false }));
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(countToSend);
    } finally {
      setIsDeleting(false);
    }
  };

  const isConfirmDisabled =
    deleteModal.checkRequired &&
    (deleteModal.expectedCount !== null
      ? parseInt(confirmInput.trim(), 10) !== deleteModal.expectedCount
      : !confirmInput.trim());

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-wrap items-center justify-between gap-3 shadow-sm relative ${
        isSelected ? "border-primary bg-primary-500/10" : "border-light bg-secondary/10 hover:border-primary/30"
      }`}
    >
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-primary p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3 text-red-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <h5 className="font-semibold text-sm text-primary poppins">{deleteModalTitle}</h5>
            </div>

            {deleteModal.checkRequired ? (
              <div className="space-y-3">
                <p className="text-xs text-secondary leading-relaxed poppins font-medium">{deleteModal.message}</p>
                <div className="space-y-1">
                  <label
                    htmlFor={`confirmInput-${actionId}`}
                    className="text-[11px] text-secondary font-semibold poppins"
                  >
                    {confirmCountLabel || "Veuillez saisir le nombre pour confirmer :"}
                  </label>
                  <input
                    id={`confirmInput-${actionId}`}
                    type="number"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder={
                      deleteModal.expectedCount !== null ? `Entrez ${deleteModal.expectedCount}` : "Nombre"
                    }
                    className="w-full border border-default rounded-xl px-3 py-1.5 text-xs bg-primary focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-secondary leading-relaxed poppins">{deleteModalDescription}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-light text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer poppins"
                onClick={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
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

      {/* CHAMPS SPÉCIFIQUES */}
      <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap sm:flex-nowrap">{children}</div>

      {/* ACTIONS COMMUNES */}
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
              className="cursor-pointer bg-primary-500 text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
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
          ) : !isLocked && canDelete ? (
            <button
              type="button"
              onClick={handleInitiateDelete}
              disabled={isDeleting || isCheckingDelete}
              title="Supprimer"
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
                ? "bg-primary-500 text-white ring-2 ring-primary/20"
                : "bg-primary border border-light hover:bg-primary-500/5 text-primary"
            }`}
          >
            <span>{selectButtonLabel}</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};