import { Equipe, User } from "@/app/calendrier/types";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { SaveAction } from "./SettingsModal";
import { MasterDetailSplitLayout, CollapsibleCreateForm, SelectableEntityRow } from "./ui";
import {  } from "./index";
import { Loader } from "../..";


const TeamMembersEditor = ({
  setting,
  selectedTeamId,
  selectedTeam,
  canAdd,
  canDelete,
}: {
  setting: any;
  selectedTeamId: string | null;
  selectedTeam?: Equipe;
  canAdd: boolean;
  canDelete: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>("");
  const [members, setMembers] = useState<User[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [removingIds, setRemovingIds] = useState<Record<number, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pendingRemoveMember, setPendingRemoveMember] = useState<User | null>(null);

  const settingRef = useRef(setting);
  useEffect(() => {
    settingRef.current = setting;
  }, [setting]);

  const loadMembers = useCallback(async () => {
    if (!selectedTeamId || typeof settingRef.current.fetchTeamMembers !== "function") return;
    setIsLoadingMembers(true);
    setError(null);
    try {
      const res = await settingRef.current.fetchTeamMembers(Number(selectedTeamId));
      if (res?.success && Array.isArray(res.data)) {
        setMembers(res.data);
      } else {
        setError(res?.message || "Erreur lors du chargement du personnel de l'équipe.");
        setMembers([]);
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors du chargement du personnel de l'équipe.");
    } finally {
      setIsLoadingMembers(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    if (!selectedTeamId) return;
    setIsOpen(false);
    setSelectedPersonnelId("");
    setFormError(null);
    loadMembers();
  }, [selectedTeamId, loadMembers]);

  // Liste du personnel non encore présent dans l'équipe
  const availablePersonnel = useMemo(() => {
    const allPersonnel: User[] = setting.allPersonnel || [];
    const existingIds = new Set(members.map((m) => Number(m.IdPersonnel)));
    return allPersonnel.filter((p) => !existingIds.has(Number(p.IdPersonnel)));
  }, [setting.allPersonnel, members]);

  const formatPersonnelName = (p: User) =>
    [p.Prenom, p.Nom].filter(Boolean).join(" ").trim() || `Personnel #${p.IdPersonnel}`;

  const handleAddMember = async () => {
    if (!canAdd || !selectedTeamId) return;

    const personnelIdToAdd = selectedPersonnelId || String(availablePersonnel[0]?.IdPersonnel || "");
    if (!personnelIdToAdd) {
      setFormError("Veuillez sélectionner un membre du personnel.");
      return;
    }

    setFormError(null);
    setError(null);
    setIsAdding(true);

    try {
      if (setting.onAddPersonnelToTeam) {
        const res = await setting.onAddPersonnelToTeam(Number(selectedTeamId), Number(personnelIdToAdd));
        if (res && res.success) {
          const addedPerson = (setting.allPersonnel || []).find(
            (p: User) => Number(p.IdPersonnel) === Number(personnelIdToAdd)
          );
          if (addedPerson) {
            setMembers((prev) => [...prev, addedPerson]);
          }
          setSelectedPersonnelId("");
          setIsOpen(false);
        } else {
          setError(res?.message || "Erreur lors de l'ajout du personnel à l'équipe.");
        }
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau lors de l'ajout du personnel.");
    } finally {
      setIsAdding(false);
    }
  };

  const executeRemoveMember = async (member: User) => {
    if (!canDelete || !selectedTeamId) return;

    setRemovingIds((prev) => ({ ...prev, [member.IdPersonnel]: true }));
    setError(null);

    try {
      if (setting.onRemovePersonnelFromTeam) {
        const res = await setting.onRemovePersonnelFromTeam(Number(selectedTeamId), Number(member.IdPersonnel));
        if (res && res.success) {
          setMembers((prev) => prev.filter((m) => Number(m.IdPersonnel) !== Number(member.IdPersonnel)));
        } else {
          setError(res?.message || "Erreur lors du retrait du personnel.");
        }
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors du retrait du personnel.");
    } finally {
      setRemovingIds((prev) => {
        const next = { ...prev };
        delete next[member.IdPersonnel];
        return next;
      });
    }
  };

  if (!selectedTeamId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-primary-bg/40 rounded-2xl border border-dashed border-light min-h-[300px]">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-primary poppins">Aucune équipe sélectionnée</p>
        <p className="text-xs text-secondary/80 mt-1 max-w-xs poppins leading-relaxed">
          Veuillez cliquer sur <span className="font-semibold text-primary">« Voir le personnel »</span> sur une équipe à
          gauche pour afficher et gérer ses membres.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full min-h-0 relative">
      <div className="flex items-center justify-between pb-2 border-b border-ultra-light">
        <h4 className="text-sm font-semibold text-primary">
          Personnel de l&apos;équipe {selectedTeam ? `« ${selectedTeam.Nom} »` : ""}
        </h4>
        <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
          {members.length} membre{members.length > 1 ? "s" : ""}
        </span>
      </div>

      {pendingRemoveMember && (
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
              <h5 className="font-semibold text-sm text-primary poppins">Retirer de l&apos;équipe ?</h5>
            </div>
            <p className="text-xs text-secondary leading-relaxed poppins">
              Êtes-vous sûr de vouloir retirer{" "}
              <strong className="text-primary">{formatPersonnelName(pendingRemoveMember)}</strong> de cette équipe ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-light text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer poppins"
                onClick={() => setPendingRemoveMember(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer poppins"
                onClick={async () => {
                  const target = pendingRemoveMember;
                  setPendingRemoveMember(null);
                  await executeRemoveMember(target);
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {canAdd &&
        (!isOpen ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setFormError(null);
              setIsOpen(true);
            }}
            className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajouter un personnel
          </button>
        ) : (
          <div className="p-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col gap-2.5 shadow-sm shrink-0">
            <div className="flex items-center justify-between pb-1 border-b border-primary/20">
              <h5 className="text-xs font-semibold text-primary">Ajouter un membre</h5>
              <button
                type="button"
                onClick={() => {
                  setSelectedPersonnelId("");
                  setFormError(null);
                  setIsOpen(false);
                }}
                className="text-secondary hover:text-primary transition-colors p-0.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {availablePersonnel.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedPersonnelId || String(availablePersonnel[0]?.IdPersonnel || "")}
                  onChange={(e) => {
                    setSelectedPersonnelId(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="border border-default rounded-lg px-2.5 py-1.5 text-xs bg-primary-bg shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none truncate"
                >
                  {availablePersonnel.map((person) => (
                    <option key={person.IdPersonnel} value={person.IdPersonnel}>
                      {formatPersonnelName(person)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={isAdding}
                  className="px-3 py-1.5 cursor-pointer bg-primary text-white rounded-lg font-medium text-xs shadow-md hover:shadow-lg flex items-center justify-center gap-1 shrink-0 disabled:opacity-50 min-w-[70px]"
                >
                  {isAdding ? (
                    <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
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
                    "Valider"
                  )}
                </button>
              </div>
            ) : (
              <p className="text-xs text-secondary italic">
                Tous les personnels disponibles font déjà partie de cette équipe.
              </p>
            )}

            {formError && <p className="text-[11px] text-red-500 font-medium">{formError}</p>}
            {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
          </div>
        ))}

      <div className="bg-primary-bg/60 rounded-xl p-3 min-h-[160px] relative flex-1 border border-light overflow-y-auto">
        {isLoadingMembers ? (
          <div className="py-8">
            <Loader size="md" message="Chargement..." />
          </div>
        ) : (
          <div className="space-y-2">
            {members.length > 0 ? (
              members.map((member) => {
                const isRemoving = Boolean(removingIds[member.IdPersonnel]);
                const fullName = formatPersonnelName(member);
                const initials = fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={member.IdPersonnel}
                    className="flex items-center justify-between bg-primary-bg rounded-lg p-2.5 shadow-sm border border-light hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                        {initials}
                      </div>
                      <span className="text-xs font-medium text-primary">{fullName}</span>
                    </div>

                    {canDelete && (
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-600 p-1 rounded transition-all cursor-pointer disabled:opacity-50"
                        disabled={isRemoving}
                        title="Retirer de l'équipe"
                        onClick={() => setPendingRemoveMember(member)}
                      >
                        {isRemoving ? (
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
                );
              })
            ) : (
              <p className="text-xs text-secondary italic text-center py-4">
                Aucun personnel assigné à cette équipe.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


const TeamRow: React.FC<{
  team: Equipe;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate?: (t: Equipe) => Promise<{ success: boolean; message?: string }>;
  onDelete?: (id: number) => Promise<void>;
  canEdit: boolean;
  canDelete: boolean;
  setError: (msg: string | null) => void;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}> = ({ team, isSelected, onSelect, onUpdate, onDelete, canEdit, canDelete, setError, registerSaveAction }) => {
  const [nom, setNom] = useState(team.Nom);
  useEffect(() => setNom(team.Nom), [team.Nom]);

  return (
    <SelectableEntityRow
        actionId={`team-${team.Id}`}
        isSelected={isSelected}
        isDirty={nom !== team.Nom}
        canEdit={canEdit}
        canDelete={canDelete}
        selectButtonLabel="Voir le personnel"
        deleteModalTitle="Supprimer l'équipe ?"
        deleteModalDescription={
            <>
            Êtes-vous sûr de vouloir supprimer l&apos;équipe <strong className="text-primary">{team.Nom}</strong> ? Cette
            action est irréversible.
            </>
        }
        onSelect={onSelect}
        onSave={async () => {
            const res = await onUpdate?.({ ...team, Nom: nom.trim() });
            if (res && !res.success) setError(res.message || "Erreur lors de la mise à jour.");
        }}
        onDelete={async () => {
            await onDelete?.(team.Id);
        }}  
        setError={setError}
        registerSaveAction={registerSaveAction}
        >
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-xs text-secondary font-medium poppins">Nom de l&apos;équipe</label>
                    <input
                        type="text"
                        value={nom}
                        onChange={(e) => {
                            setNom(e.target.value);
                            setError(null);
                        }}
                        disabled={!canEdit}
                        className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary poppins text-xs bg-primary-bg shadow-sm w-full"
                    />
            </div>
    </SelectableEntityRow>
  );
};



export const TeamsManagementCategoryContent: React.FC<{
  categoryObj: any;
  setApiError: (err: string | null) => void;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}> = ({ categoryObj, setApiError, registerSaveAction }) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const teamsSetting = categoryObj.items?.find((item: any) => item.type === "team-settings");
  const membersSetting = categoryObj.items?.find((item: any) => item.type === "team-members-settings");

  const selectedTeam = useMemo(
    () => teamsSetting?.teams?.find((t: Equipe) => String(t.Id) === String(selectedTeamId)),
    [teamsSetting?.teams, selectedTeamId]
  );

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      setFormError("Le nom de l'équipe est obligatoire.");
      return;
    }
    setIsCreating(true);
    setApiError(null);
    try {
      const res = await teamsSetting?.onAddTeam?.({ Nom: newTeamName.trim() });
      if (res?.success) {
        setNewTeamName("");
        setFormError(null);
      } else {
        setApiError(res?.message || "Erreur lors de la création de l'équipe.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <MasterDetailSplitLayout
      leftTitle="Équipes"
      leftContent={
        <>
          {teamsSetting?.canAdd && (
            <CollapsibleCreateForm
              addButtonLabel="Ajouter une équipe"
              headerTitle="Nouvelle équipe"
              isSubmitting={isCreating}
              error={formError}
              onOpen={() => setApiError(null)}
              onReset={() => {
                setNewTeamName("");
                setFormError(null);
              }}
              onSubmit={handleCreateTeam}
            >
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-xs text-secondary font-medium poppins">Nom de l&apos;équipe</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => {
                    setNewTeamName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Ex: Équipe Technique, Commercial..."
                  className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary poppins text-xs bg-primary-bg shadow-sm w-full"
                />
              </div>
            </CollapsibleCreateForm>
          )}

          <div className="space-y-3">
            {teamsSetting?.teams?.map((team: Equipe) => (
              <TeamRow
                key={team.Id}
                team={team}
                isSelected={String(team.Id) === String(selectedTeamId)}
                onSelect={() => setSelectedTeamId(String(team.Id))}
                onUpdate={teamsSetting.onUpdateTeam}
                onDelete={async (id) => {
                  const res = await teamsSetting.onDeleteTeam?.(id);
                  if (res?.success && String(selectedTeamId) === String(id)) setSelectedTeamId(null);
                }}
                canEdit={teamsSetting.canEdit}
                canDelete={teamsSetting.canDelete}
                setError={setApiError}
                registerSaveAction={registerSaveAction}
              />
            ))}
          </div>
        </>
      }
      rightContent={
        membersSetting && (
          <TeamMembersEditor
            setting={membersSetting}
            selectedTeamId={selectedTeamId}
            selectedTeam={selectedTeam}
            canAdd={membersSetting.canAdd}
            canDelete={membersSetting.canDelete}
          />
        )
      }
    />
  );
};