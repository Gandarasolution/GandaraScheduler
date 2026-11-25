import { Equipe, User } from "@/app/calendrier/types";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { SaveAction } from "./ControlPanelModal";
import {
  MasterDetailSplitLayout,
  CollapsibleCreateForm,
  SelectableEntityRow,
  EmptySelectionPlaceholder,
} from "./ui";
import { Combobox, Loader, TrashIcon } from "../..";
import { UserX, Lock } from "lucide-react";
import { ComboboxOption } from "../../ui/Combobox";
import { useAuth } from "@/app/calendrier/hooks/utils/AuthContext";


const isEmployeeLocked = (person: any): boolean => {
  if (!person?.isLocked) return false;
  if (typeof person.isLocked === "boolean") return person.isLocked;
  return Boolean(person.isLocked.status);
};


const getEmployeeLockedByName = (person: any): string | null => {
  if (!person?.isLocked || typeof person.isLocked !== "object") return null;
  return person.isLocked.UpdatedByNom ?? person.isLocked.updatedByNom ?? null;
};


const TeamMembersEditor = ({
  setting,
  selectedTeamId,
  selectedTeam,
  globalEmployees = [],
  lastMercureEvent,
  teams = [],
  canAdd,
  canDelete,
}: {
  setting: any;
  selectedTeamId: string | null;
  selectedTeam?: Equipe;
  teams?: Equipe[];
  globalEmployees?: User[];
  lastMercureEvent: { action: string; data: any } | null;
  canAdd: boolean;
  canDelete: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showInactiveMembers, setShowInactiveMembers] = useState(false);
  const [showAssignedPersonnel, setShowAssignedPersonnel] = useState(false);
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

  // Nouveaux états pour la modale dynamique de transfert / verrouillage
  const [pendingTransferIds, setPendingTransferIds] = useState<string[] | null>(null);
  const [transferChoices, setTransferChoices] = useState<Record<string, boolean>>({});

  const settingRef = useRef(setting);
  const allPersonnelRef = useRef<User[]>(allPersonnel);

  useEffect(() => {
    settingRef.current = setting;
  }, [setting]);

  useEffect(() => {
    allPersonnelRef.current = allPersonnel;
  }, [allPersonnel]);

  // Chargement de tout le personnel via fetAllPersonnel
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

  // 1. Synchronisation dès que globalEmployees change
  useEffect(() => {
    if (!Array.isArray(globalEmployees) || globalEmployees.length === 0) return;

    const globalMap = new Map(
      globalEmployees.map((emp) => [Number(emp.IdPersonnel), emp])
    );

    setAllPersonnel((prev) =>
      prev.map((p) => {
        const updated = globalMap.get(Number(p.IdPersonnel));
        if (!updated) return p;
        return {
          ...p,
          isLocked: (updated as any).isLocked,
          Equipe: (updated as any).Equipe ?? (p as any).Equipe,
          IdEquipe: (updated as any).Equipe ?? (p as any).IdEquipe,
        };
      })
    );

    if (selectedTeamId) {
      const currentTeamIdNum = Number(selectedTeamId);

      setMembers((prev) => {
        const updatedExisting = prev
          .map((m) => {
            const updated = globalMap.get(Number(m.IdPersonnel));
            if (!updated) return m;
            return {
              ...m,
              isLocked: (updated as any).isLocked,
              Equipe: (updated as any).Equipe,
            };
          })
          .filter((m) => {
            const empTeam = (m as any).Equipe;
            return empTeam === undefined || empTeam === null || Number(empTeam) === currentTeamIdNum;
          });

        const existingIds = new Set(updatedExisting.map((m) => Number(m.IdPersonnel)));
        const newlyAssigned: User[] = [];
        for (const emp of globalEmployees) {
          const empId = Number(emp.IdPersonnel);
          if (Number((emp as any).Equipe) === currentTeamIdNum && !existingIds.has(empId)) {
            existingIds.add(empId);
            newlyAssigned.push(emp);
          }
        }

        return newlyAssigned.length > 0
          ? [...updatedExisting, ...newlyAssigned]
          : updatedExisting;
      });
    }
  }, [globalEmployees, selectedTeamId]);

  // 2. Fallback direct sur l'événement Mercure
  useEffect(() => {
    if (!lastMercureEvent) return;
    const { action, data } = lastMercureEvent;

    if (action === "EMPLOYEE_LOCKED" || action === "EMPLOYEE_UNLOCKED") {
      const empId = Number(data?.employeeId);
      const lockState =
        action === "EMPLOYEE_LOCKED"
          ? {
              status: true,
              ...(typeof data?.isLocked === "object" ? data.isLocked : {}),
              UpdatedByNom:
                data?.isLocked?.UpdatedByNom ??
                data?.isLocked?.updatedByNom ??
                data?.UpdatedByNom ??
                data?.updatedByNom ??
                null,
            }
          : false;

      setAllPersonnel((prev) =>
        prev.map((p) =>
          Number(p.IdPersonnel) === empId ? ({ ...p, isLocked: lockState } as User) : p
        )
      );
      setMembers((prev) =>
        prev.map((m) =>
          Number(m.IdPersonnel) === empId ? ({ ...m, isLocked: lockState } as User) : m
        )
      );
    }

    if (action === "EMPLOYEE_TEAM_UPDATED" && selectedTeamId) {
      const empId = Number(data?.employeeId);
      const newTeamId =
        data?.idEquipe !== null && data?.idEquipe !== undefined
          ? Number(data.idEquipe)
          : null;

      setAllPersonnel((prev) =>
        prev.map((p) =>
          Number(p.IdPersonnel) === empId
            ? ({ ...p, Equipe: newTeamId, IdEquipe: newTeamId } as User)
            : p
        )
      );

      if (newTeamId === Number(selectedTeamId)) {
        setMembers((prev) => {
          if (prev.some((m) => Number(m.IdPersonnel) === empId)) return prev;
          const found = allPersonnelRef.current.find(
            (p) => Number(p.IdPersonnel) === empId
          );
          return found ? [...prev, { ...found, Equipe: newTeamId } as User] : prev;
        });
      } else {
        setMembers((prev) => prev.filter((m) => Number(m.IdPersonnel) !== empId));
      }
    }
  }, [lastMercureEvent, selectedTeamId]);

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
    console.log(members);
  }, [members]);

  useEffect(() => {
    if (!selectedTeamId) return;
    setIsOpen(false);
    setShowInactiveMembers(false);
    setShowAssignedPersonnel(false);
    setSelectedPersonnelIds([]);
    setPendingTransferIds(null);
    setTransferChoices({});
    setFormError(null);
    loadMembers();
  }, [selectedTeamId, loadMembers]);

  const formatPersonnelName = useCallback(
    (p: User) =>
      [p.Nom, p.Prenom].filter(Boolean).join(" ").trim() || `Personnel #${p.IdPersonnel}`,
    []
  );

  const getPersonCurrentTeam = useCallback(
    (person: User): { id: string; name: string } | null => {
      const p = person as any;
      const rawEquipe =
        p.Equipe ??
        p.IdEquipe ??
        p.EquipeId ??
        p.idEquipe ??
        p.equipe_id ??
        p.equipe;

      if (rawEquipe === null || rawEquipe === undefined) return null;

      let teamId: string | null = null;
      let embeddedName: string | null = null;

      if (typeof rawEquipe === "object") {
        const objId = rawEquipe.Id ?? rawEquipe.id ?? rawEquipe.IdEquipe;
        if (objId !== null && objId !== undefined) teamId = String(objId).trim();
        embeddedName = rawEquipe.Nom ?? rawEquipe.nom ?? rawEquipe.Libelle ?? null;
      } else {
        teamId = String(rawEquipe).trim();
      }

      if (!teamId || teamId === "" || teamId === "0" || teamId === "null" || teamId === "undefined") {
        return null;
      }

      const foundTeam = teams.find((t) => String(t.Id).trim() === teamId);
      const teamName =
        foundTeam?.Nom ||
        embeddedName ||
        p.EquipeNom ||
        p.NomEquipe ||
        `Équipe #${teamId}`;

      return { id: teamId, name: teamName };
    },
    [teams]
  );

  // Calcul réactif des catégories dans la modale (se met à jour en direct avec Mercure)
  const transferModalData = useMemo(() => {
    if (!pendingTransferIds || !selectedTeamId) return null;

    const alreadyAssignedUnlocked: { person: User; currentTeamName: string }[] = [];
    const lockedEmployees: {
      person: User;
      currentTeamName: string | null;
      lockedByName: string | null;
    }[] = [];
    const freeEmployees: User[] = [];

    for (const idStr of pendingTransferIds) {
      const person = allPersonnel.find((p) => String(p.IdPersonnel) === String(idStr));
      if (!person) continue;

      const currentTeam = getPersonCurrentTeam(person);
      if (currentTeam && currentTeam.id === String(selectedTeamId).trim()) continue;

      if (isEmployeeLocked(person)) {
        lockedEmployees.push({
          person,
          currentTeamName: currentTeam ? currentTeam.name : null,
          lockedByName: getEmployeeLockedByName(person),
        });
      } else if (currentTeam) {
        alreadyAssignedUnlocked.push({
          person,
          currentTeamName: currentTeam.name,
        });
      } else {
        freeEmployees.push(person);
      }
    }

    return {
      alreadyAssignedUnlocked,
      lockedEmployees,
      freeEmployees,
    };
  }, [pendingTransferIds, allPersonnel, selectedTeamId, getPersonCurrentTeam]);

  // Initialise automatiquement le choix à `true` (Oui) lorsqu'un employé est déverrouillé en direct
  useEffect(() => {
    if (!transferModalData) return;
    setTransferChoices((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const { person } of transferModalData.alreadyAssignedUnlocked) {
        const key = String(person.IdPersonnel);
        if (next[key] === undefined) {
          next[key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [transferModalData]);

  const inactiveMembersCount = useMemo(
    () => members.filter((m) => m.Actif === false || (m as any).isActif === false).length,
    [members]
  );

  const displayedMembers = useMemo(() => {
    if (showInactiveMembers) return members;
    return members.filter((m) => m.Actif !== false && (m as any).isActif !== false);
  }, [members, showInactiveMembers]);

  const availablePersonnel = useMemo(() => {
    const existingIds = new Set(members.map((m) => Number(m.IdPersonnel)));
    return allPersonnel.filter((p) => !existingIds.has(Number(p.IdPersonnel)));
  }, [allPersonnel, members]);

  const comboboxOptions = useMemo(
    () =>
      availablePersonnel
        .map((person) => {
          const isLocked = isEmployeeLocked(person);
          const lockedByName = getEmployeeLockedByName(person);
          const currentTeam = getPersonCurrentTeam(person);
          const hasTeam = currentTeam !== null;

          const phaseOrder = hasTeam ? 1 : 0;

          let label = `${formatPersonnelName(person)} ( ${person.IdPersonnel} )`;
          if (hasTeam) {
            label += ` — [${currentTeam.name}]`;
          }
          if (isLocked) {
            label += lockedByName
              ? ` (Verrouillé par ${lockedByName})`
              : " (Verrouillé)";
          }

          return {
            value: String(person.IdPersonnel),
            label,
            hasTeam,
            isLocked,
            phaseOrder,
            icon: isLocked ? <Lock className="w-3.5 h-3.5 text-secondary" /> : undefined,
          };
        })
        .sort((a, b) => a.phaseOrder - b.phaseOrder),
    [availablePersonnel, formatPersonnelName, getPersonCurrentTeam]
  );

  const isOptionAlreadyInTeam = useCallback(
    (opt: ComboboxOption) => Boolean(opt.hasTeam),
    []
  );

  const executeAddMembers = async (personnelIdsToAdd: string[]) => {
    if (!canAdd || !selectedTeamId) return;

    setFormError(null);
    setError(null);
    setIsAdding(true);

    try {
      if (setting.onAddPersonnelToTeam) {
        const addedUsers: User[] = [];
        const errors: string[] = [];

        for (const idStr of personnelIdsToAdd) {
          const personnelId = Number(idStr);
          const res = await setting.onAddPersonnelToTeam(Number(selectedTeamId), personnelId);
          if (res && res.success) {
            const addedPerson = allPersonnel.find(
              (p: User) => Number(p.IdPersonnel) === personnelId
            );
            if (addedPerson) {
              addedUsers.push({
                ...addedPerson,
                Equipe: Number(selectedTeamId),
              } as User);
            }
          } else {
            errors.push(res?.message || `Erreur pour l'employé #${personnelId}`);
          }
        }

        if (addedUsers.length > 0) {
          const addedIdsSet = new Set(addedUsers.map((u) => Number(u.IdPersonnel)));
          setMembers((prev) => {
            const existingIds = new Set(prev.map((m) => Number(m.IdPersonnel)));
            const uniqueNewUsers = addedUsers.filter(
              (u) => !existingIds.has(Number(u.IdPersonnel))
            );
            return uniqueNewUsers.length > 0 ? [...prev, ...uniqueNewUsers] : prev;
          });
          setAllPersonnel((prev) =>
            prev.map((p) =>
              addedIdsSet.has(Number(p.IdPersonnel))
                ? ({ ...p, Equipe: Number(selectedTeamId), IdEquipe: Number(selectedTeamId) } as User)
                : p
            )
          );
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

  const handleAddMembers = async () => {
    if (!canAdd || !selectedTeamId) return;

    if (selectedPersonnelIds.length === 0) {
      setFormError("Veuillez sélectionner au moins un membre du personnel.");
      return;
    }

    // Ouvrir la fenêtre récapitulative si au moins un employé est verrouillé OU déjà dans une autre équipe
    const requiresReview = selectedPersonnelIds.some((idStr) => {
      const person = allPersonnel.find((p) => String(p.IdPersonnel) === String(idStr));
      if (!person) return false;
      if (isEmployeeLocked(person)) return true;

      const currentTeam = getPersonCurrentTeam(person);
      return currentTeam !== null && currentTeam.id !== String(selectedTeamId).trim();
    });

    if (requiresReview) {
      const initialChoices: Record<string, boolean> = {};
      for (const idStr of selectedPersonnelIds) {
        initialChoices[idStr] = true;
      }
      setTransferChoices(initialChoices);
      setPendingTransferIds([...selectedPersonnelIds]);
      return;
    }

    await executeAddMembers(selectedPersonnelIds);
  };

  const handleConfirmTransferModal = async () => {
    if (!transferModalData) return;

    // On récupère les employés libres + ceux déjà dans une équipe pour lesquels l'utilisateur a choisi "Oui"
    const idsToAdd = [
      ...transferModalData.freeEmployees.map((p) => String(p.IdPersonnel)),
      ...transferModalData.alreadyAssignedUnlocked
        .filter(({ person }) => transferChoices[String(person.IdPersonnel)] !== false)
        .map(({ person }) => String(person.IdPersonnel)),
    ];

    setPendingTransferIds(null);
    setTransferChoices({});

    if (idsToAdd.length === 0) {
      return;
    }

    await executeAddMembers(idsToAdd);
  };

  const executeRemoveMember = async (member: User) => {
    if (!canDelete || !selectedTeamId) return;

    setRemovingIds((prev) => ({ ...prev, [member.IdPersonnel]: true }));
    setError(null);

    try {
      if (setting.onRemovePersonnelFromTeam) {
        const res = await setting.onRemovePersonnelFromTeam(
          Number(selectedTeamId),
          Number(member.IdPersonnel)
        );
        if (res && res.success) {
          setMembers((prev) =>
            prev.filter((m) => Number(m.IdPersonnel) !== Number(member.IdPersonnel))
          );
          setAllPersonnel((prev) =>
            prev.map((p) =>
              Number(p.IdPersonnel) === Number(member.IdPersonnel)
                ? ({ ...p, Equipe: null, IdEquipe: null } as User)
                : p
            )
          );
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

  // Nombre total d'employés effectivement validables dans la modale
  const confirmedCountInModal = transferModalData
    ? transferModalData.freeEmployees.length +
      transferModalData.alreadyAssignedUnlocked.filter(
        ({ person }) => transferChoices[String(person.IdPersonnel)] !== false
      ).length
    : 0;

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
                  : "bg-primary text-secondary border-light hover:text-primary hover:border-primary/30"
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

          <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
            {displayedMembers.length} membre{displayedMembers.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Modale récapitulative dynamique (Déjà dans une équipe vs Verrouillés) */}
      {transferModalData && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 rounded-xl">
          <div className="bg-primary p-5 rounded-2xl shadow-xl max-w-md w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3 text-amber-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h5 className="font-semibold text-sm text-primary">
                  Validation de l&apos;ajout à {selectedTeam ? `« ${selectedTeam.Nom} »` : "l'équipe"}
                </h5>
                <p className="text-[11px] text-secondary">
                  Vérifiez les affectations avant de confirmer.
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {/* Section 1 : Personnel non verrouillé mais déjà dans une équipe */}
              {transferModalData.alreadyAssignedUnlocked.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                    Déjà dans une autre équipe ({transferModalData.alreadyAssignedUnlocked.length})
                  </p>
                  <div className="space-y-1.5">
                    {transferModalData.alreadyAssignedUnlocked.map(({ person, currentTeamName }) => {
                      const idKey = String(person.IdPersonnel);
                      const isAccepted = transferChoices[idKey] !== false;

                      return (
                        <div
                          key={person.IdPersonnel}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl border border-light bg-secondary/5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-primary truncate">
                              {formatPersonnelName(person)}
                            </p>
                            <p className="text-[11px] text-secondary truncate">
                              Équipe actuelle : <strong className="text-primary">« {currentTeamName} »</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setTransferChoices((prev) => ({ ...prev, [idKey]: true }))
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                isAccepted
                                  ? "bg-primary-500 text-white border-primary-500 shadow-xs"
                                  : "bg-primary text-secondary border-light hover:text-primary"
                              }`}
                            >
                              Oui
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setTransferChoices((prev) => ({ ...prev, [idKey]: false }))
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                !isAccepted
                                  ? "bg-red-500 text-white border-red-500 shadow-xs"
                                  : "bg-primary text-secondary border-light hover:text-primary"
                              }`}
                            >
                              Non
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 2 : Personnel verrouillé (aucun bouton Oui/Non) */}
              {transferModalData.lockedEmployees.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Personnel verrouillé — non modifiable ({transferModalData.lockedEmployees.length})
                  </p>
                  <div className="space-y-1.5">
                    {transferModalData.lockedEmployees.map(({ person, currentTeamName, lockedByName }) => (
                      <div
                        key={person.IdPersonnel}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl border border-light bg-black/5 opacity-75"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-primary truncate">
                            {formatPersonnelName(person)}
                          </p>
                          {currentTeamName && (
                            <p className="text-[11px] text-secondary truncate">
                              Équipe actuelle : « {currentTeamName} »
                            </p>
                          )}
                          <p className="text-[11px] text-amber-700 truncate">
                            {lockedByName
                              ? `Verrouillé par ${lockedByName}`
                              : "Actuellement verrouillé"}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-secondary bg-black/10 border border-light px-2 py-0.5 rounded-full shrink-0">
                          <Lock className="w-2.5 h-2.5" />
                          Verrouillé
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Information sur les employés libres inclus dans la sélection */}
              {transferModalData.freeEmployees.length > 0 && (
                <p className="text-[11px] text-secondary pt-1">
                  + <strong className="text-primary">{transferModalData.freeEmployees.length}</strong>{" "}
                  autre{transferModalData.freeEmployees.length > 1 ? "s" : ""} membre
                  {transferModalData.freeEmployees.length > 1 ? "s" : ""} sans équipe seront ajouté
                  {transferModalData.freeEmployees.length > 1 ? "s" : ""} directement.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-ultra-light">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-light text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                onClick={() => {
                  setPendingTransferIds(null);
                  setTransferChoices({});
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={confirmedCountInModal === 0}
                className="px-3.5 py-1.5 rounded-xl bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleConfirmTransferModal}
              >
                Valider{confirmedCountInModal > 0 ? ` (${confirmedCountInModal})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de confirmation de retrait */}
      {pendingRemoveMember && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 rounded-xl">
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
              setShowAssignedPersonnel(false);
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
                  setSelectedPersonnelIds([]);
                  setShowAssignedPersonnel(false);
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
                    showInactive={showAssignedPersonnel}
                    onToggleInactive={setShowAssignedPersonnel}
                    isOptionHidden={isOptionAlreadyInTeam}
                    showInactiveLabel="Afficher le personnel déjà dans une équipe"
                    hideInactiveLabel="Masquer le personnel déjà dans une équipe"
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

      <div className="bg-primary/60 rounded-xl p-3 min-h-[160px] relative flex-1 border border-light overflow-y-auto">
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
                const isMemberLocked = isEmployeeLocked(member);

                return (
                  <div
                    key={member.IdPersonnel}
                    className={`flex items-center justify-between bg-primary rounded-lg p-2.5 shadow-sm border border-light transition-all group ${
                      isMemberLocked ? "opacity-55 grayscale select-none" : "hover:shadow-md"
                    }`}
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
                          } ${!isMemberActive || isMemberLocked ? "grayscale" : ""}`}
                        />
                        {member.Type === "INTERIM" && (
                          <span
                            className={`absolute -bottom-1 -right-1 block h-3 w-3 rounded-full border-2 border-white ${
                              !isMemberActive || isMemberLocked ? "bg-gray-400" : "bg-interim"
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
                      {isMemberLocked && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-secondary bg-black/10 border border-light px-2 py-0.5 rounded-full">
                          <Lock className="w-2.5 h-2.5" />
                          Verrouillé
                        </span>
                      )}
                    </div>

                    {canDelete && !isMemberLocked && (
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-600 p-1 rounded transition-all cursor-pointer disabled:opacity-50"
                        disabled={isRemoving}
                        title="Retirer de l'équipe"
                        onClick={() => setPendingRemoveMember(member)}
                      >
                        <TrashIcon className="w-4 h-4" />
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


const isTeamLockedByOther = (team: Equipe): boolean => {
  if (!team?.isLocked) return false;
  if (typeof team.isLocked === "boolean") return team.isLocked;
  return Boolean(team.isLocked.status);
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

  const isLocked = isTeamLockedByOther(team);
  const effectiveCanEdit = canEdit && !isLocked;
  const effectiveCanDelete = canDelete && !isLocked;

  return (
    <div
      className={`transition-all ${
        isLocked ? "opacity-55 grayscale pointer-events-none select-none" : ""
      }`}
    >
      <SelectableEntityRow
        actionId={`team-${team.Id}`}
        isSelected={isSelected}
        isDirty={!isLocked && nom !== team.Nom}
        canEdit={effectiveCanEdit}
        canDelete={effectiveCanDelete}
        selectButtonLabel={isLocked ? "Verrouillée" : "Voir le personnel"}
        deleteModalTitle="Supprimer l'équipe ?"
        confirmCountLabel="Veuillez saisir le nombre de salarié(s) pour confirmer :"
        deleteModalDescription={
          <>
            Êtes-vous sûr de vouloir supprimer l&apos;équipe{" "}
            <strong className="text-primary">{team.Nom}</strong> ? Cette action est irréversible.
          </>
        }
        onSelect={() => {
          if (!isLocked) onSelect();
        }}
        onSave={async () => {
          if (isLocked) return;
          const res = await onUpdate?.({ ...team, Nom: nom.trim() });
          if (res && !res.success) setError(res.message || "Erreur lors de la mise à jour.");
        }}
        onCheckDelete={
          effectiveCanDelete && onCheckDelete ? () => onCheckDelete(team.Id) : undefined
        }
        onDelete={async (count: number) => {
          if (isLocked) return;
          await onDelete?.(team.Id, count);
        }}
        setError={setError}
        registerSaveAction={registerSaveAction}
      >
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-secondary font-medium poppins">
              Nom de l&apos;équipe
            </label>
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-secondary bg-black/10 border border-light px-2 py-0.5 rounded-full">
                <Lock className="w-2.5 h-2.5" />
                En cours de modification
              </span>
            )}
          </div>
          <input
            type="text"
            value={nom}
            onChange={(e) => {
              if (isLocked) return;
              setNom(e.target.value);
              setError(null);
            }}
            disabled={!effectiveCanEdit}
            className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary poppins text-xs bg-primary shadow-sm w-full disabled:cursor-not-allowed"
          />
        </div>
      </SelectableEntityRow>
    </div>
  );
};

export const TeamsManagementCategoryContent: React.FC<{
  categoryObj: any;
  setApiError: (err: string | null) => void;
  registerSaveAction: (id: string, action: SaveAction | null) => void;
}> = ({ categoryObj, setApiError, registerSaveAction }) => {
  const { user } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null);
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

  // Charge les équipes dans le DataLayer si initialTeams est encore vide
  const loadTeamsList = useCallback(async () => {
    const fetchFn = teamsSettingRef.current?.fetchEquipes;
    if (typeof fetchFn !== "function") return;

    setIsLoadingTeams(true);
    setApiError(null);
    try {
      await fetchFn();
    } catch (err: any) {
      setApiError(err?.message || "Erreur lors du chargement des équipes.");
    } finally {
      setIsLoadingTeams(false);
    }
  }, [setApiError]);

  useEffect(() => {
    loadTeamsList();
  }, [loadTeamsList]);

  // Lecture directe depuis initialTeams (toujours synchronisé avec Mercure)
  const validTeams = useMemo(() => {
    const rawTeams = teamsSetting?.initialTeams;
    if (!rawTeams) return [];
    const list: Equipe[] = Array.isArray(rawTeams) ? rawTeams : Object.values(rawTeams);
    return list.filter((t: Equipe) => t && t.Id !== null && t.Id !== undefined);
  }, [teamsSetting?.initialTeams]);

  const selectedTeam = useMemo(
    () => validTeams.find((t: Equipe) => String(t.Id) === String(selectedTeamId)),
    [validTeams, selectedTeamId]
  );

  // Si l'équipe actuellement sélectionnée se fait verrouiller par quelqu'un d'autre, on la désélectionne
  useEffect(() => {
    if (selectedTeam && isTeamLockedByOther(selectedTeam)) {
      setSelectedTeamId(null);
      setLockExpiresAt(null);
    }
  }, [selectedTeam]);

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

  // Normalise le timestamp renvoyé par l'API (en millisecondes)
  const normalizeTimestampMs = (rawExpiresIn?: number): number => {
    if (!rawExpiresIn) return Date.now() + 300_000;
    // Si le timestamp est en secondes (ex: 1732440000), on le convertit en ms
    if (rawExpiresIn < 1e12) return rawExpiresIn * 1000;
    return rawExpiresIn;
  };

  const handleSelectTeam = useCallback(
    async (team: Equipe) => {
      if (isTeamLockedByOther(team)) return;
      setApiError(null);

      setSelectedTeamId(String(team.Id));


      if (typeof teamsSetting?.lockEquipe !== "function") {
        return;
      }

      try {
        const res = await teamsSetting.lockEquipe(team.Id, user?.Nom + " " + user?.Prenom);
        const data = res?.data ?? res;

        if (!res?.success && !data?.isLocked) {
          setApiError(
            data?.message || res?.message || "Cette équipe est actuellement verrouillée par un autre utilisateur."
          );
          return;
        }

        setLockExpiresAt(normalizeTimestampMs(data?.expiresIn ?? res?.expiresIn));
      } catch (err: any) {
        setApiError(
          err?.response?.data?.message ||
            err?.message ||
            "Cette équipe est actuellement verrouillée par un autre utilisateur."
        );
      }
    },
    [setApiError, teamsSetting]
  );

  // Renouvellement automatique du verrou 10 secondes avant le timestamp d'expiration
  useEffect(() => {
    if (!selectedTeamId || !lockExpiresAt) return;

    const refreshDelay = Math.max(1000, lockExpiresAt - Date.now() - 10_000);
    const timer = window.setTimeout(async () => {
      try {
        const res = await teamsSettingRef.current?.lockEquipe?.(Number(selectedTeamId), user?.Nom + " " + user?.Prenom);
        const data = res?.data ?? res;
        if (res?.success || data?.isLocked) {
          setLockExpiresAt(normalizeTimestampMs(data?.expiresIn ?? res?.expiresIn));
        } else {
          // Le verrou a été perdu entre-temps
          setSelectedTeamId(null);
          setLockExpiresAt(null);
        }
      } catch {
        setSelectedTeamId(null);
        setLockExpiresAt(null);
      }
    }, refreshDelay);

    return () => window.clearTimeout(timer);
  }, [selectedTeamId, lockExpiresAt]);

  // Libération automatique du verrou quand on change d'équipe ou ferme la modale
  useEffect(() => {
    if (!selectedTeamId) return;

    const currentId = Number(selectedTeamId);
    return () => {
      teamsSettingRef.current?.unlockEquipe?.(currentId)?.catch(() => {});
    };
  }, [selectedTeamId]);

  return (
    <MasterDetailSplitLayout
      leftTitle="Équipes"
      leftContent={
        <div className="flex flex-col gap-3 h-full min-h-0">
          {/* Section fixe (non scrollable) */}
          {teamsSetting?.canAdd && (
            <div className="shrink-0">
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
                  <label className="text-xs text-secondary font-medium poppins">
                    Nom de l&apos;équipe
                  </label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => {
                      setNewTeamName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="Ex: Équipe Technique, Commercial..."
                    className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary poppins text-xs bg-primary shadow-sm w-full"
                  />
                </div>
              </CollapsibleCreateForm>
            </div>
          )}

          {/* Section scrollable contenant uniquement les équipes */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
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
                    onSelect={() => handleSelectTeam(team)}
                    onUpdate={async (updatedTeam) => {
                      return await teamsSetting.onUpdateTeam?.(updatedTeam);
                    }}
                    onCheckDelete={teamsSetting.onCheckDeleteTeam}
                    onDelete={async (id, count) => {
                      const res = await teamsSetting.onDeleteTeam?.(id, count);
                      if (res?.success) {
                        if (String(selectedTeamId) === String(id)) {
                          setSelectedTeamId(null);
                          setLockExpiresAt(null);
                        }
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
          </div>
        </div>
      }
      rightContent={
        membersSetting && (
          <TeamMembersEditor
            setting={membersSetting}
            selectedTeamId={selectedTeamId}
            selectedTeam={selectedTeam}
            teams={validTeams}
            globalEmployees={membersSetting.globalEmployees}
            lastMercureEvent={membersSetting.lastMercureEvent}
            canAdd={membersSetting.canAdd}
            canDelete={membersSetting.canDelete}
          />
        )
      }
      leftContentClassName="lg:col-span-6!"
      rightContentClassName="lg:col-span-6!"
    />
  );
};