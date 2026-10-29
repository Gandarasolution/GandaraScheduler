import { useEffect, useState } from "react";
import { CategoryStructure } from ".";
import { Appointment, AutreItem, ChantierItem, Equipe, Item, User } from "../../types";
import { AppointmentItem } from "../Calendar";
import { GenericDataItem } from "./DataTableFrame";
import { AlertCircle, ArrowRightLeft, Check } from "lucide-react";

const getWithSeparator = (num: string, colonne: string): string => {
    if (colonne === 'TM' || colonne === 'HR' || colonne === 'DPF' || colonne === 'RPF' || colonne === 'SH' || colonne === 'SP') {
      num = num + 'h';
    }
    if (colonne === 'AP' ) {
      num = num + '%';
    }
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  
export interface TableConfigDeps {
  handleOpenEditModal?: (app: Appointment) => void;
  onImageClick?: (user: User) => void;
  initialTeams?: Record<number, Equipe>;
  onTeamChange?: (employee: User, groupId: number | null) => Promise<{ success: boolean }>;
  onTransfer?: (employee: User) => void;
  ressources?: Record<number, Item>;
  setNotification?: (message: string) => void;
}

// 1. Renderer pour les images de Chantiers / Paie (Affiche un mini AppointmentItem)
const imageRendererChantierAndPaie = (value: any, item: any, deps: TableConfigDeps) => {
    ////console.log('Rendering image for item:', item);
    const Item = { ...item, IdPlanningRessource: Number(item.IdPlanningRessource)}
    return (
        <AppointmentItem
          appointment={{
            IdPlanningEvenement: 0,
            AnnotationPlanningEvenement: '',
            IdPlanningRessource: Item.IdPlanningRessource,
            DebutPlanningEvenement: 0,
            FinPlanningEvenement: 1000,
            IdEmploye: 0,
            isLocked: false,
          }}
          isFullDay={false}
          isMobile={false}
          event={Item}
          chargeeAffaire=''
          source='demo'
          className='cursor-pointer'
          onClick={() => {
            if (deps.ressources) deps.ressources[Number(Item.IdPlanningRessource)] = Item; // Assurer que la ressource est à jour
            const newAppointment: Appointment = {
                IdPlanningEvenement: 0,
                AnnotationPlanningEvenement: '',
                IdPlanningRessource: Item.IdPlanningRessource,
                DebutPlanningEvenement: 0,
                FinPlanningEvenement: 1000,
                IdEmploye: 0,
                isLocked: false,
            }
            if (deps.handleOpenEditModal) deps.handleOpenEditModal(newAppointment);
          }} 
          mainScrollRef={null}
        />
    );
  };

  // 2. Renderer pour les valeurs importantes (Alertes rouges)
const analyseChantierRender = (value: any, item: any, attributeKey: string) => {
const apValue = parseFloat(value) || 0;

// Logique: Si AP > 100% ou Solde < 0, on affiche en rouge
if ((attributeKey === 'AP' && apValue > 100) || (attributeKey === 'SP' && apValue < 0)) {
    return (
    <div className='flex items-center justify-end w-full h-full gap-2'>
        <svg 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="text-red-600"
        >
        <path 
            d="M12 2L21.09 20H2.91L12 2Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinejoin="round"
            fill="currentColor"
        />
        <path 
            d="M12 9V13M12 17H12.01" 
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        </svg>
        <span className="text-red-600 poppins font-medium">{getWithSeparator(String(value), attributeKey)}</span>
    </div>
    );
}
return (
    <div className='flex items-center justify-end w-full h-full'>
    <span className="poppins">{getWithSeparator(String(value), attributeKey)}</span>
    </div>
);
};

  // 3. Renderer pour l'image des employés (Avatar rond)
const imageRendererEmployee = (value: any, item: User, deps: TableConfigDeps) => {
    const isInactive = item.Actif === false;
    return (
        <div className="relative inline-block" style={{ opacity: isInactive ? 0.5 : 1 }}>
            <img
                src={item.Image ?? `https://placehold.co/32x32/cccccc/333333?text=${item.Nom.charAt(0)}`}
                alt={item.Nom + ' ' + item.Prenom}
                loading="lazy"
                className={`w-10 h-10 rounded-full border shadow ${item.Type === 'INTERIM' ? 'border-interim' : 'border-employee'} ${isInactive ? 'grayscale' : ''}`}
                // onClick={(e) => {
                //     e.stopPropagation();
                //     if (deps.onImageClick) deps.onImageClick(item);
                // }}
            />
            {item.Type === 'INTERIM' && (
                <span className={`absolute -bottom-1 -right-1 block h-3 w-3 rounded-full border-2 border-white ${isInactive ? 'bg-gray-400' : 'bg-interim'}`}></span>
            )}
        </div>
    );
};

export const getTableStructure = (viewType: string, deps: TableConfigDeps = {}): CategoryStructure[] => {
    if (viewType === 'chantier-table') 
        return [
            {
                key: 'IG',
                label: 'Informations Générales', 
                attributes: [
                    { key: 'Image', label: '', sortable: false , width:60, renderer: (value, item) => imageRendererChantierAndPaie(value, item, deps)},
                    { key: 'Pole',   label: 'Pôle', type:'string', /*width:120 */},
                    { key: 'DateOS', label: 'Date OS', type:'date', width:100 },
                    { key: 'DateFin', label: 'Date Fin', type:'date', width:100 },
                    { key: 'Code',  label: 'Code', type:'string', width:85 },
                    { key: 'Identifiant',  label: 'Identifiant', type:'string' /*width:125 */, 
                        renderer: (value: string) => (
                        <div className="flex items-center justify-start w-full h-full">
                            <span className="poppins break-words">{value}</span>
                        </div>
                        )},
                    { key: 'Libelle' , label: 'Libellé', type:'string', renderer: (value: string) => (
                        <div className="flex items-center justify-start w-full h-full">
                            <span className="poppins break-words">{value}</span>
                        </div>
                    )},
                    { key: 'Etat', label: 'État', type:'string', width:140,
                    renderer:(value: string) => {
                        const statusColors: Record<string, string> = {
                        //'Annulé': 'bg-red-100 text-red-800'
                        };
                        const colorClass = statusColors[value] || 'bg-gray-100 text-gray-800';
                        return (
                        <div className="flex items-center justify-center w-full h-full whitespace-nowrap">
                            <span className={`inline-flex h-[25px] justify-center items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                            {value}
                            </span>
                        </div>
                        );
                    },
                    },
                    { key: 'ChargeAffaire',  label: 'Chargé d\'Affaires', type:'string', /*width:140 */ },
                    { key: 'ChefChantier',  label: 'Chef de Chantier', type:'string', /*width:140 */ },
                ]
            },
            {
                key: 'AC',
                label: 'Analyse Chantier',
                attributes: [
                    { key: 'TM',  label: 'Temps Marché', type:'string', width:80, renderer: (value: any, item: any) => analyseChantierRender(value, item, 'TM')},      // Temps Marché
                    { key: 'HR',  label: 'Heures Réalisées', type:'string' , width:90, renderer: (value: any, item: any) => analyseChantierRender(value, item, 'HR')},       // Heures Réalisées
                    { key: 'SH',  label: 'Solde Heures', type:'string', width:80, renderer: (value: any, item: any) => analyseChantierRender(value, item, 'SH') },       // Solde Heure
                    { key: 'DPF',  label: 'Durée Planifiée', type:'string', width:85, renderer: (value: any, item: any) => analyseChantierRender(value, item, 'DPF') },    // Durée Planifiée
                    { key: 'RPF',  label: 'Réalisé + Futur', type:'string', width:80, renderer: (value: any, item: any) => analyseChantierRender(value, item, 'RPF') },  // Réalisé + Future
                    { key: 'AP',  label: 'Avancement Prévisionnel', type:'string', width:110, renderer:(value: any, item: any) => analyseChantierRender(value, item, 'AP') },       // Avancement Prév.
                    { key: 'SP',  label: 'Solde P.', type:'string', width:100, renderer: (value: any, item: any) => analyseChantierRender(value, item, 'SP')}        // Solde Prév.
                ]
            }
        ] 
    if (viewType === 'paie-table') 
        return [
            {
            key: 'all',
            label: '', 
            attributes: [
                { key: 'Verrou', label: 'Verrou', width: 80, 
                renderer: (value: boolean) => (          
                    <div className="flex items-center justify-center">
                    {value ? (
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"/>
                        </svg>
                    )}
                    </div>
                ),
                },
                { key: 'Image', label: '', sortable: false, width:50, renderer: (value, item) => imageRendererChantierAndPaie(value, item, deps)},
                { key: 'CodePlanningRessource', label: 'Code', width: 150},
                { key: 'LibellePlanningRessource', label: 'Libellé' },
                { key: 'Actif', label: 'ACTF', width: 70, 
                renderer:(value: boolean) => (
                    <div className="flex items-center justify-center">
                    <span className={`w-3 h-3 rounded-full ${value ? 'bg-green-600' : 'bg-red-600'}`}></span>
                    </div>
                ) 
                },
                { key: 'Category', label: 'Catégorie', width: 300}
            ]
            }
        ]
    if (viewType === 'employee-table') 
        return [
        {
            key: 'all',
            label: '',
            attributes: [
            { key: 'Image', label: '', sortable: false, width:60, renderer: (value: any, item: GenericDataItem) => imageRendererEmployee(value, item as unknown as User, deps)},
            { key: 'Code', label: 'Code', width: 100},
            { key: 'Nom', label: 'Nom' },
            { key: 'Prenom', label: 'Prénom'}, 
            { key: 'Equipe', label: 'Équipe', 
                renderer:(value: any, item: GenericDataItem) => (  
                <TeamSelectCell
                    item={item as unknown as User}
                    initialTeams={deps.initialTeams || {}}
                    onTeamChange={deps.onTeamChange || (async () => ({ success: true }))}
                    setNotification={deps.setNotification || (() => {})}
                />
                ), 
            },
            { key: 'Type', label: 'Type', 
                renderer: (value: string) => {
                const typeColors: Record<string, string> = {
                    'INTERIM': 'bg-interim text-white',
                    'SALARIE': 'bg-employee text-white',
                };
                const colorClass = typeColors[value] || 'bg-gray-100 text-gray-800';
                // Capitalize first letter
                const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
                
                return (
                    <div className="flex items-center justify-center w-full h-full">
                    <span className={`inline-flex w-[80px] h-[25px] justify-center items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                        {label}
                    </span>
                    </div>
                );
                }
            },
            { key: 'actions', label: 'Actions', sortable: false, width: 180,
                renderer: (_value: any, item: GenericDataItem) => (
                    <div className="flex items-center justify-center w-full h-full">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                deps.onTransfer?.(item as unknown as User);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white border border-primary rounded-lg bg-primary-500 hover:bg-primary-600 transition-colors cursor-pointer"
                        >
                            <ArrowRightLeft className="w-4 h-4" /> 
                            Transférer
                        </button>
                    </div>
                )
            }
            ]
        }
        ]
    if (viewType === 'manual-event-table')
        return [
    {
            key: 'general',
            label: 'Informations',
            attributes: [
            {
                key: 'image',
                label: 'Image',
                type: 'custom',
                sortable: false,
                align: 'center',
                width: 200,
                renderer: (value, item ) => (
                <div 
                    className="flex items-center justify-center cursor-pointer"
                    onDoubleClick={() => {
                        //console.log('Double click on item:', item);
                        const Item = { ...item, IdPlanningRessource: Number(item.IdPlanningRessource)}
                        if (deps.ressources) deps.ressources[Number(Item.IdPlanningRessource)] = Item as unknown as AutreItem; // Assurer que la ressource est à jour

                        const newAppointment: Appointment = {
                            IdPlanningEvenement: 0,
                            AnnotationPlanningEvenement: '',
                            IdPlanningRessource: Item.IdPlanningRessource,
                            DebutPlanningEvenement: 0,
                            FinPlanningEvenement: 1000,
                            IdEmploye: 0,
                            isLocked: false,
                        }
                        if (deps.handleOpenEditModal) deps.handleOpenEditModal(newAppointment);
                    }}
                >
                    {(item as any).Image?.image ? (
                        <img
                            src={(item as any).Image.image}
                            alt="Employee"
                            className="w-10 h-10 rounded-lg"
                        />
                    ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                        N/A
                    </div>
                    )}
                </div>
                )
            },
            {
                key: 'LibellePlanningRessource',
                label: 'Description',
                type: 'custom',
                sortable: true,
                align: 'left',
                width: { min: 200, weight: 2 },
                renderer: (value, item) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-primary">{item.LibellePlanningRessource}</span>
                    <span className="text-xs text-secondary">{item.CodePlanningRessource}</span>
                </div>
                )
            },
            {
                key: 'Actif',
                label: 'Statut',
                type: 'custom',
                sortable: true,
                align: 'center',
                width: 150,
                renderer: (value, item) => {
                const isActive = 'Actif' in item ? (item as any).Actif : true;
                return (
                    <div className="flex items-center justify-center">
                    {isActive ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Actif
                        </span>
                    ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Désactivé
                        </span>
                    )}
                    </div>
                );
                }
            }
            ]
        }
        ]
    // Default: return empty structure when no matching viewType
    return [];
};



  
interface TeamSelectCellProps {
  item: any;
  initialTeams: Record<number, any>;
  onTeamChange: (item: any, newGroupId: number | null) => Promise<{ success: boolean }>;
  setNotification: (message: string) => void;
}


const TeamSelectCell = ({ item, initialTeams, onTeamChange, setNotification }: TeamSelectCellProps) => {
  const initialValue = item.Equipe || '';
  const [localValue, setLocalValue] = useState<string | number>(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [isError, setIsError] = useState(false); 

  // Maintien de la synchro avec la donnée serveur
  useEffect(() => {
    setLocalValue(item.Equipe || '');
    setIsError(false); // Réinitialise l'erreur si la donnée serveur change
  }, [item.Equipe]);

  const hasChanged = localValue.toString() !== initialValue.toString();

  const handleSave = () => {
    if (!onTeamChange) return;
    
    setIsSaving(true);
    setIsError(false); // On réinitialise l'état d'erreur avant de réessayer
    
    const newGroupId = localValue ? Number(localValue) : null;

    onTeamChange(item, newGroupId)
      .then(response => {
        if (!response.success) {
          // En cas d'échec : on déclenche l'erreur, on NE REVERT PAS pour laisser le bouton visible
          setIsError(true);
          setNotification("Erreur lors de la mise à jour de l'équipe. Veuillez réessayer.");
        } else {
          item.Equipe = newGroupId; // Mise à jour de la valeur dans l'objet item
        }
      })
      .catch(() => {
        setIsError(true); // On déclenche l'erreur ici aussi
        setNotification("Erreur lors de la mise à jour de l'équipe. Veuillez réessayer.");
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  return (
    <div className="flex items-center justify-start w-full h-full gap-2">
      <select
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          setIsError(false); // 👈 On enlève le rouge si l'utilisateur change à nouveau la valeur
        }}
        onClick={(e) => e.stopPropagation()}
        disabled={isSaving}
        className={`w-full px-2 py-1 text-sm border rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer disabled:opacity-50 ${
          isError ? 'border-red-500 focus:border-red-500' : 'border-default focus:border-primary'
        }`}
      >
        <option value="">Aucune équipe</option>
        {Object.values(initialTeams).map((team: any) => (
          <option key={team.Id} value={team.Id}>
            {team.Nom}
          </option>
        ))}
      </select>

      {hasChanged && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSave();
          }}
          disabled={isSaving}
          className={`cursor-pointer p-1 text-white rounded-md disabled:opacity-50 transition-colors flex-shrink-0 ${
            isError 
              ? 'bg-red-500 hover:bg-red-600' // 👈 Rouge en cas d'erreur
              : 'bg-primary hover:bg-secondary' // Couleur normale
          }`}
          title={isError ? "Réessayer" : "Appliquer le changement"}
        >
          {isSaving ? (
            <span className="w-4 h-4 block border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isError ? (
            <AlertCircle size={20} /> // 👈 Icône qui change si erreur (optionnel, tu peux garder Check)
          ) : (
            <Check size={20} />
          )}
        </button>
      )}
    </div>
  );
};

export default TeamSelectCell;