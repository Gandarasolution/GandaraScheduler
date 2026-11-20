import { Equipe, User } from "@/app/calendrier/types";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { SaveAction } from "./ControlPanelModal";
import {
  MasterDetailSplitLayout,
  CollapsibleCreateForm,
  SelectableEntityRow,
  EmptySelectionPlaceholder,
} from "./ui";
import { Combobox, Loader } from "../..";
import { UserCheck, UserX } from "lucide-react";

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
  const [showInactiveMembers, setShowInactiveMembers] = useState(false);
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<string[]>([]);
  const [allPersonnel, setAllPersonnel] = useState<User[]>([]);
  const [isLoadingAllPersonnel, setIsLoadingAllPersonnel] = useState(false);
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

  // Chargement de tout le personnel actif via fetAllPersonnel
  useEffect(() => {
    if (typeof settingRef.current.fetAllPersonnel !== "function") return;
    let isMounted = true;
    setIsLoadingAllPersonnel(true);

    settingRef.current
      .fetAllPersonnel()
      .then((res: any) => {
        if (!isMounted) return;
        if (Array.isArray(res)) {
          setAllPersonnel(res);
        } else if (res?.success && Array.isArray(res.data)) {
          setAllPersonnel(res.data);
        } else {
          setAllPersonnel([]);
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        console.error("Erreur lors du chargement de tout le personnel :", err);
        setAllPersonnel([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingAllPersonnel(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
    setShowInactiveMembers(false);
    setSelectedPersonnelIds([]);
    setFormError(null);
    loadMembers();
  }, [selectedTeamId, loadMembers]);

  const formatPersonnelName = useCallback(
    (p: User) =>
      [p.Prenom, p.Nom].filter(Boolean).join(" ").trim() || `Personnel #${p.IdPersonnel}`,
    []
  );

  // Filtrage des membres affichés selon l'état du bouton "Voir le personnel inactif"
  const inactiveMembersCount = useMemo(
    () => members.filter((m) => m.Actif === false || (m as any).isActif === false).length,
    [members]
  );

  const displayedMembers = useMemo(() => {
    if (showInactiveMembers) return members;
    return members.filter((m) => m.Actif !== false && (m as any).isActif !== false);
  }, [members, showInactiveMembers]);

  // Liste du personnel non encore présent dans l'équipe
  const availablePersonnel = useMemo(() => {
    const existingIds = new Set(members.map((m) => Number(m.IdPersonnel)));
    return allPersonnel.filter((p) => !existingIds.has(Number(p.IdPersonnel)));
  }, [allPersonnel, members]);

  // Options formatées pour le Combobox
  const comboboxOptions = useMemo(
    () =>
      availablePersonnel.map((person) => {
        const isActif = (person as any).Actif !== false && (person as any).isActif !== false;
        return {
          value: String(person.IdPersonnel),
          label: `${formatPersonnelName(person)} ( ${person.IdPersonnel} )`,
          isActif,
        };
      }),
    [availablePersonnel, formatPersonnelName]
  );

  const handleAddMembers = async () => {
    if (!canAdd || !selectedTeamId) return;

    if (selectedPersonnelIds.length === 0) {
      setFormError("Veuillez sélectionner au moins un membre du personnel.");
      return;
    }

    setFormError(null);
    setError(null);
    setIsAdding(true);

    try {
      if (setting.onAddPersonnelToTeam) {
        const addedUsers: User[] = [];
        const errors: string[] = [];

        for (const idStr of selectedPersonnelIds) {
          const personnelId = Number(idStr);
          const res = await setting.onAddPersonnelToTeam(Number(selectedTeamId), personnelId);
          if (res && res.success) {
            const addedPerson = allPersonnel.find(
              (p: User) => Number(p.IdPersonnel) === personnelId
            );
            if (addedPerson) addedUsers.push(addedPerson);
          } else {
            errors.push(res?.message || `Erreur pour l'employé #${personnelId}`);
          }
        }

        if (addedUsers.length > 0) {
          setMembers((prev) => [...prev, ...addedUsers]);
        }

        if (errors.length === 0) {
          setSelectedPersonnelIds([]);
          setIsOpen(false);
        } else {
          setError(errors[0]);
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

  useEffect(() => {
    if (inactiveMembersCount === 0 && showInactiveMembers) {
      setShowInactiveMembers(false);
    }
  }, [inactiveMembersCount, showInactiveMembers]);

  if (!selectedTeamId) {
    return (
      <EmptySelectionPlaceholder
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        }
        title="Aucune équipe sélectionnée"
        actionLabel="Voir le personnel"
        targetDescription="une équipe"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full min-h-0 relative">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-ultra-light">
        <h4 className="text-sm font-semibold text-primary">
          Personnel de l&apos;équipe {selectedTeam ? `« ${selectedTeam.Nom} »` : ""}
        </h4>

        <div className="flex items-center gap-2">
          {inactiveMembersCount > 0 && (
            <button
              type="button"
              onClick={() => setShowInactiveMembers((prev) => !prev)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                showInactiveMembers
                  ? "bg-amber-500/15 text-amber-700 border-amber-500/30 shadow-xs"
                  : "bg-primary-500-bg text-secondary border-light hover:text-primary hover:border-primary/30"
              }`}
              title={
                showInactiveMembers
                  ? "Masquer le personnel inactif"
                  : "Afficher également le personnel inactif"
              }
            >
              <UserX className="w-3.5 h-3.5 shrink-0" />
              <span>Voir le personnel inactif</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px] font-bold">
                {inactiveMembersCount}
              </span>
            </button>
          )}

          <span className="text-[11px] font-semibold text-primary bg-primary-500/10 px-2.5 py-0.5 rounded-full">
            {displayedMembers.length} membre{displayedMembers.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {pendingRemoveMember && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 rounded-xl">
          <div className="bg-primary-500-bg p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150 text-left">
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
            className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary-500/5 hover:bg-primary-500/10 text-primary font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajouter un personnel
          </button>
        ) : (
          <div className="p-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary-500/5 flex flex-col gap-2.5 shadow-sm shrink-0">
            <div className="flex items-center justify-between pb-1 border-b border-primary/20">
              <h5 className="text-xs font-semibold text-primary">Ajouter un membre</h5>
              <button
                type="button"
                onClick={() => {
                  setSelectedPersonnelIds([]);
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

            {isLoadingAllPersonnel ? (
              <div className="py-2">
                <Loader size="sm" message="Chargement du personnel..." />
              </div>
            ) : availablePersonnel.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Combobox
                    multiple={true}
                    options={comboboxOptions}
                    value={selectedPersonnelIds}
                    onValueChange={(vals: string[]) => {
                      setSelectedPersonnelIds(vals);
                      if (formError) setFormError(null);
                    }}
                    placeholder="Rechercher du personnel..."
                    showInactiveToggle={true}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddMembers}
                  disabled={isAdding || selectedPersonnelIds.length === 0}
                  className="px-3 py-1.5 cursor-pointer bg-primary-500 text-white rounded-lg font-medium text-xs shadow-md hover:shadow-lg flex items-center justify-center gap-1 shrink-0 disabled:opacity-50 min-w-[70px]"
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
                    `Valider${selectedPersonnelIds.length > 0 ? ` (${selectedPersonnelIds.length})` : ""}`
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

      <div className="bg-primary-500-bg/60 rounded-xl p-3 min-h-[160px] relative flex-1 border border-light overflow-y-auto">
        {isLoadingMembers ? (
          <div className="py-8">
            <Loader size="md" message="Chargement..." />
          </div>
        ) : (
          <div className="space-y-2">
            {displayedMembers.length > 0 ? (
              displayedMembers.map((member) => {
                const isRemoving = Boolean(removingIds[member.IdPersonnel]);
                const fullName = formatPersonnelName(member);
                const isMemberActive = member.Actif !== false && (member as any).isActif !== false;

                return (
                  <div
                    key={member.IdPersonnel}
                    className="flex items-center justify-between bg-primary-500-bg rounded-lg p-2.5 shadow-sm border border-light hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative inline-block" style={{ opacity: !isMemberActive ? 0.5 : 1 }}>
                        <img
                          src={
                            member.Image ??
                            `https://placehold.co/32x32/cccccc/333333?text=${(member.Nom || "?").charAt(0)}`
                          }
                          alt={`${member.Nom || ""} ${member.Prenom || ""}`}
                          loading="lazy"
                          className={`w-7 h-7 rounded-full border shadow ${
                            member.Type === "INTERIM" ? "border-interim" : "border-employee"
                          } ${!isMemberActive ? "grayscale" : ""}`}
                        />
                        {member.Type === "INTERIM" && (
                          <span
                            className={`absolute -bottom-1 -right-1 block h-3 w-3 rounded-full border-2 border-white ${
                              !isMemberActive ? "bg-gray-400" : "bg-interim"
                            }`}
                          ></span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-primary">{fullName}</span>
                      {!isMemberActive && (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          Inactif
                        </span>
                      )}
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
                {members.length > 0 && !showInactiveMembers
                  ? "Aucun personnel actif assigné à cette équipe."
                  : "Aucun personnel assigné à cette équipe."}
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
  onCheckDelete?: (id: number) => Promise<{ checkRequired: boolean; message?: string }>;
  onDelete?: (id: number, count: number) => Promise<void>;
  canEdit: boolean;
  canDelete: boolean;
  setError: (msg: string | null) => void;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}> = ({
  team,
  isSelected,
  onSelect,
  onUpdate,
  onCheckDelete,
  onDelete,
  canEdit,
  canDelete,
  setError,
  registerSaveAction,
}) => {
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
      confirmCountLabel="Veuillez saisir le nombre de salarié(s) pour confirmer :"
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
      onCheckDelete={onCheckDelete ? () => onCheckDelete(team.Id) : undefined}
      onDelete={async (count: number) => {
        await onDelete?.(team.Id, count);
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
          className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary poppins text-xs bg-primary-500-bg shadow-sm w-full"
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
  const [teams, setTeams] = useState<Equipe[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const teamsSetting = categoryObj.items?.find((item: any) => item.type === "team-settings");
  const membersSetting = categoryObj.items?.find((item: any) => item.type === "team-members-settings");

  const teamsSettingRef = useRef(teamsSetting);
  useEffect(() => {
    teamsSettingRef.current = teamsSetting;
  }, [teamsSetting]);

  const loadTeamsList = useCallback(async () => {
    const fetchFn = teamsSettingRef.current?.fetchEquipes;
    if (typeof fetchFn !== "function") return;

    setIsLoadingTeams(true);
    setApiError(null);
    try {
      const res = await fetchFn();
      if (Array.isArray(res)) {
        setTeams(res);
      } else if (res?.success && Array.isArray(res.data)) {
        setTeams(res.data);
      } else if (res?.success && res.data && typeof res.data === "object") {
        setTeams(Object.values(res.data));
      } else if (res && typeof res === "object" && !("success" in res)) {
        setTeams(Object.values(res));
      } else if (res && !res.success) {
        setApiError(res.message || "Erreur lors du chargement des équipes.");
        setTeams([]);
      }
    } catch (err: any) {
      setApiError(err?.message || "Erreur lors du chargement des équipes.");
      setTeams([]);
    } finally {
      setIsLoadingTeams(false);
    }
  }, [setApiError]);

  useEffect(() => {
    loadTeamsList();
  }, [loadTeamsList]);

  const validTeams = useMemo(
    () => teams.filter((t: Equipe) => t && t.Id !== null && t.Id !== undefined),
    [teams]
  );

  const selectedTeam = useMemo(
    () => validTeams.find((t: Equipe) => String(t.Id) === String(selectedTeamId)),
    [validTeams, selectedTeamId]
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
        await loadTeamsList();
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
                  className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary poppins text-xs bg-primary-500-bg shadow-sm w-full"
                />
              </div>
            </CollapsibleCreateForm>
          )}

          {isLoadingTeams ? (
            <div className="py-8">
              <Loader size="md" message="Chargement des équipes..." />
            </div>
          ) : validTeams.length > 0 ? (
            <div className="space-y-3">
              {validTeams.map((team: Equipe) => (
                <TeamRow
                  key={team.Id}
                  team={team}
                  isSelected={String(team.Id) === String(selectedTeamId)}
                  onSelect={() => setSelectedTeamId(String(team.Id))}
                  onUpdate={async (updatedTeam) => {
                    const res = await teamsSetting.onUpdateTeam?.(updatedTeam);
                    if (res?.success) {
                      setTeams((prev) =>
                        prev.map((t) => (String(t.Id) === String(updatedTeam.Id) ? updatedTeam : t))
                      );
                    }
                    return res;
                  }}
                  onCheckDelete={teamsSetting.onCheckDeleteTeam}
                  onDelete={async (id, count) => {
                    const res = await teamsSetting.onDeleteTeam?.(id, count);
                    if (res?.success) {
                      setTeams((prev) => prev.filter((t) => String(t.Id) !== String(id)));
                      if (String(selectedTeamId) === String(id)) setSelectedTeamId(null);
                    } else if (res && !res.success) {
                      setApiError(res.message || "Erreur lors de la suppression de l'équipe.");
                    }
                  }}
                  canEdit={teamsSetting.canEdit}
                  canDelete={teamsSetting.canDelete}
                  setError={setApiError}
                  registerSaveAction={registerSaveAction}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-secondary italic text-center py-6">
              Aucune équipe enregistrée.
            </p>
          )}
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