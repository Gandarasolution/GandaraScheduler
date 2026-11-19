import { ImageType } from "@/app/calendrier/types";
import { DisplaySettings } from "@/app/service/displaySettings.service";
import { useState, useEffect, useCallback } from "react";
import { AppointmentItem } from "../../Calendar";
import { ColorHexInput, Loader } from "../../ui";
import { InlineSaveButton, previewAppointment, previewItem, SaveAction, SelectSettingItem } from "./SettingsModal";





const DefaultDisplaySettingsEditor = ({
  setting,
  registerSaveAction,
}: {
  setting: {
    id?: string;
    value: DisplaySettings | null;
    fetchDisplaySettings: () => Promise<{ success: boolean; message?: string }>;
    onChange: (value: DisplaySettings) => Promise<{ success: boolean; message?: string }>;
    onSelectImage: (onSelect: (image: ImageType) => void, actualImage?: ImageType) => void;
    onApplyToAllEvents?: (value: DisplaySettings) => Promise<{ success: boolean; message?: string }>;
  };
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}) => {
  const [localValue, setLocalValue] = useState<DisplaySettings | null>(setting.value);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(
    setting.value ? JSON.stringify(setting.value) : null
  );
  const [isLoading, setIsLoading] = useState(!setting.value);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!setting.value) {
      setIsLoading(true);
      setting
        .fetchDisplaySettings()
        .then((result) => {
          if (mounted && !result.success) setError(result.message || "Erreur lors du chargement.");
        })
        .catch((err: any) => {
          if (mounted) setError(err?.message || "Erreur lors du chargement.");
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [setting.value, setting.fetchDisplaySettings]);

  useEffect(() => {
    if (!setting.value) return;
    const serialized = JSON.stringify(setting.value);
    if (serialized !== savedSnapshot) {
      setSavedSnapshot(serialized);
      setLocalValue(setting.value);
    }
  }, [setting.value, savedSnapshot]);

  const isDirty = !!localValue && JSON.stringify(localValue) !== savedSnapshot;

  const save = useCallback(async () => {
    if (!localValue) return;
    const result = await setting.onChange(localValue);
    if (!result.success) {
      throw new Error(result.message || "Erreur lors de la sauvegarde.");
    }
    setSavedSnapshot(JSON.stringify(localValue));
  }, [localValue, setting]);

  useEffect(() => {
    const actionId = String(setting.id || "default-display-settings");
    registerSaveAction(actionId, { isDirty, save });
    return () => registerSaveAction(actionId, null);
  }, [setting.id, isDirty, save, registerSaveAction]);

  const handleInlineSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await save();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateColor = (
    key: keyof Pick<
      DisplaySettings,
      "CouleurBordureParDefaut" | "CouleurFondParDefaut" | "CouleurTexteParDefaut"
    >,
    value: string
  ) => {
    setLocalValue((previous) => (previous ? { ...previous, [key]: value } : previous));
  };

  const handleConfirmApplyToAllEvents = async () => {
    if (!localValue || !setting.onApplyToAllEvents) return;

    setIsConfirmOpen(false);
    setIsApplying(true);
    setError(null);

    try {
      if (isDirty) {
        await save();
      }
      const result = await setting.onApplyToAllEvents(localValue);
      if (!result.success) {
        setError(result.message || "Erreur lors de l'application à tous les événements.");
      } else {
        setSavedSnapshot(JSON.stringify(localValue));
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'application à tous les événements.");
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) return <Loader message="Chargement des options d’affichage..." />;
  if (!localValue) {
    return <p className="text-sm text-red-600">{error || "Options d’affichage indisponibles."}</p>;
  }

  const image = localValue.ImageParDefaut;
  const selectedImage: ImageType | undefined = image ? { id: Number(image.id), image: image.url } : undefined;

  const handleOpenImagePicker = () => {
    setting.onSelectImage((selected) => {
      setLocalValue((previous) =>
        previous
          ? {
              ...previous,
              ImageParDefaut: { id: selected.id, url: selected.image },
            }
          : previous
      );
    }, selectedImage);
  };

  return (
    <div className="space-y-5 w-full">
      <div>
        <h4 className="text-sm font-semibold text-primary">Définition l’apparence par défaut des chantiers</h4>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-row items-center gap-4">
        <div className="flex items-center gap-2.5 pb-1">
          <button
            type="button"
            onClick={handleOpenImagePicker}
            title="Choisir une image par défaut"
            className="w-10 h-10 rounded border border-default overflow-hidden bg-secondary-bg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-sm flex-shrink-0"
          >
            {image ? (
              <img src={image.url} alt="Image par défaut" className="w-full h-full object-contain" />
            ) : (
              <svg className="w-3.5 h-3.5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        </div>

        <div className="flex flex-col gap-2.5 max-w-xs">
          <ColorHexInput
            id="default-color-fond"
            label="Couleur de fond"
            value={localValue.CouleurFondParDefaut}
            fallbackColor="#1E40AF"
            onChange={(val) => updateColor("CouleurFondParDefaut", val)}
          />

          <ColorHexInput
            id="default-color-bordure"
            label="Couleur de bordure"
            value={localValue.CouleurBordureParDefaut}
            fallbackColor="#1E40AF"
            onChange={(val) => updateColor("CouleurBordureParDefaut", val)}
          />

          <ColorHexInput
            id="default-color-texte"
            label="Couleur de texte"
            value={localValue.CouleurTexteParDefaut}
            fallbackColor="#FFFFFF"
            onChange={(val) => updateColor("CouleurTexteParDefaut", val)}
          />
        </div>

        <div className="pb-0.5 ml-auto">
          <InlineSaveButton isDirty={isDirty} isSaving={isSaving} onSave={handleInlineSave} className="w-full" />
          {setting.onApplyToAllEvents && (
            <div className="pt-2">
              <button
                type="button"
                disabled={isApplying}
                onClick={() => setIsConfirmOpen(true)}
                className="
                  px-3 py-2 rounded-xl border border-default text-white hover:bg-primary-600 
                  bg-primary text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isApplying ? (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  "Appliquer à tous les chantier"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <AppointmentItem
        appointment={{
          ...previewAppointment,
        }}
        event={{
          ...previewItem,
          CouleurFondPlanningRessource: localValue.CouleurFondParDefaut,
          CouleurBordurePlanningRessource: localValue.CouleurBordureParDefaut,
          CouleurTextePlanningRessource: localValue.CouleurTexteParDefaut,
        }}
        isFullDay={true}
        source={"demo"}
        isMobile={false}
        isDisplayWeekend={false}
        chargeeAffaire={previewItem && previewItem?.Type === "Projet" ? previewItem?.ChargeAffaire : ""}
        onDoubleClick={() => {}}
        onAppointmentResize={() => {}}
        handleContextMenu={() => {}}
        tagPlacement={localStorage.getItem("tagPlacement") as "hover" | "fixed" | undefined}
        mainScrollRef={null}
      />

      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className="w-full max-w-sm rounded-2xl border border-default bg-primary-bg dark:bg-neutral-900 p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 id="confirm-modal-title" className="text-base font-semibold text-primary">
                Confirmation
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                Voulez-vous vraiment appliquer ces paramètres d&apos;affichage à tous les événements existants ?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-default text-primary hover:bg-secondary-bg text-xs font-medium cursor-pointer transition-colors"
              >
                Non
              </button>
              <button
                type="button"
                onClick={handleConfirmApplyToAllEvents}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity"
              >
                Oui
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DisplaySettingsCategoryContent: React.FC<{
  categoryObj: any;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}> = ({ categoryObj, registerSaveAction }) => {
  return (
    <div className="space-y-6 flex-1">
      {categoryObj.items?.map((setting: any, settingIdx: number) => (
        <div
          key={setting.id}
          className={`flex flex-col lg:flex-row justify-between lg:items-center ${
            settingIdx !== categoryObj.items.length - 1 ? "border-b border-ultra-light pb-4" : ""
          }`}
        >
          {setting.type === "default-display-settings" ? (
            <DefaultDisplaySettingsEditor setting={setting} registerSaveAction={registerSaveAction} />
          ) : setting.type === "select" ? (
            <SelectSettingItem setting={setting} registerSaveAction={registerSaveAction} />
          ) : (
            <input
              id={setting.id}
              type={setting.type}
              className="border border-default rounded-xl px-4 py-3 text-sm bg-transparent shadow-sm w-48"
              value={setting.value}
              onChange={(e) => setting.onChange(e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
};