import React from 'react';
import { addHours } from "date-fns";
import { Appointment, User, ChantierItem, Groupe } from "../types";
import { HOURS_PER_DAY } from "./constants";
import { AppointmentItem } from '@/app/calendrier/components'; // Assurez-vous que le chemin est bon


// --- FACTORY DES RENDERERS (AFFICHAGE DES CELLULES DES TABLEAUX ) ---

export const customRenderersFactory = (
  viewType: string, 
  employees: User[], 
  onImageClick: (employee: User) => void,
  setSelectedAppointment: (appointment: Appointment) => void,
  handleOpenEditModal: (appointment: Appointment) => void,
  // Ces deux derniers arguments sont optionnels pour la compatibilité, 
  // mais nécessaires pour le sélecteur d'équipe dans le tableau employé
  initialTeams: Groupe[],
  onTeamChange: (empId: number, groupId: number | null) => void
) => {

  const getWithSeparator = (num: string): string => {
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // 1. Renderer pour les images de Chantiers / Paie (Affiche un mini AppointmentItem)
  const imageRendererChantierAndPaie = (value: any, item: any) => {
    const chantierItem = item as ChantierItem;
    return (
        <AppointmentItem
          appointment={{
            IdPlanningEvenement: 0,
            AnnotationPlanningEvenement: '',
            Type: chantierItem.Type,
            IdPlanningRessource: chantierItem.IdPlanningRessource,
            DebutPlanningEvenement: 0,
            FinPlanningEvenement: 1000,
            IdEmploye: employees[0].IdPersonnel,
          }}
          isFullDay={false}
          isMobile={false}
          event={chantierItem}
          chargeeAffaire=''
          source='demo'
          className='cursor-pointer'
          onDoubleClick={() => {
            const newAppointment: Appointment = {
              IdPlanningEvenement: 0,
              AnnotationPlanningEvenement: '',
              Type: chantierItem.Type,
              IdPlanningRessource: chantierItem.IdPlanningRessource,
              DebutPlanningEvenement: 0,
              FinPlanningEvenement: 1000,
              IdEmploye: employees[0].IdPersonnel,
            }
            setSelectedAppointment(newAppointment);
            handleOpenEditModal(newAppointment);
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
          <span className="text-red-600 poppins font-medium">{getWithSeparator(value)}</span>
        </div>
      );
    }
    return (
      <div className='flex items-center justify-end w-full h-full'>
        <span className="poppins">{getWithSeparator(value)}</span>
      </div>
    );
  };

  // 3. Renderer pour l'image des employés (Avatar rond)
  const imageRendererEmployee = (value: any, item: any) => {
    const isInactive = item.actif === false;
    return (
      <div className="relative inline-block" style={{ opacity: isInactive ? 0.5 : 1 }}>
        <img
          src={item.image?.image ?? `https://placehold.co/32x32/cccccc/333333?text=${item.nom?.charAt(0) || '?'}`}
          alt={item.nom + ' ' + item.prenom}
          className={`cursor-pointer w-8 h-8 rounded-full border shadow ${item.type === 'interim' ? 'border-interim' : 'border-employee'} ${isInactive ? 'grayscale' : ''}`}
          onError={(e) => { e.currentTarget.src = `https://placehold.co/32x32/cccccc/333333?text=${item.nom?.charAt(0) || '?'}`; }}
          onClick={(e) => {
              e.stopPropagation();
              onImageClick(employees.find(emp => emp.IdPersonnel === item.id)!);
          }}
        />
        {item.type === 'interim' && (
          <span className={`absolute -bottom-1 -right-1 block h-3 w-3 rounded-full border-2 border-white ${isInactive ? 'bg-gray-400' : 'bg-interim'}`}></span>
        )}
      </div>
    );
  };


  // --- RETOUR SELON LE VIEW TYPE ---

  if (viewType === 'chantier-table') {

    return {
      image: imageRendererChantierAndPaie,
      etat: (value: string) => {
        const statusColors: Record<string, string> = {
          'En cours': 'bg-green-100 text-green-800',
          'Planifié': 'bg-blue-100 text-blue-800',
          'Suspendu': 'bg-yellow-100 text-yellow-800',
          'Terminé': 'bg-gray-100 text-gray-800',
          'Annulé': 'bg-red-100 text-red-800'
        };
        const colorClass = statusColors[value] || 'bg-gray-100 text-gray-800';
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span className={`inline-flex w-[80px] h-[25px] justify-center items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
              {value}
            </span>
          </div>
        );
      },
      AP: (value: any, item: any) => analyseChantierRender(value, item, 'AP'),
      SP: (value: any, item: any) => analyseChantierRender(value, item, 'SP'),
      TM: (value: any, item: any) => analyseChantierRender(value, item, 'TM'),
      HR: (value: any, item: any) => analyseChantierRender(value, item, 'HR'),
      SH: (value: any, item: any) => analyseChantierRender(value, item, 'SH'),
      DPF: (value: any, item: any) => analyseChantierRender(value, item, 'DPF'),
      RPF: (value: any, item: any) => analyseChantierRender(value, item, 'RPF'),

    };
  }

  if (viewType === 'paie-table') {
    return {
      image: imageRendererChantierAndPaie,
      verrou: (value: boolean) => (          
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
      actif: (value: boolean) => (
        <div className="flex items-center justify-center">
          <span className={`w-3 h-3 rounded-full ${value ? 'bg-green-600' : 'bg-red-600'}`}></span>
        </div>
      )
    };
  }

  // Default: Employee Table
  return {
    image: imageRendererEmployee,
    equipe: (value: any, item: any) => (  
      <div className="flex items-center justify-start w-full h-full">
        {/* Selecteur d'équipe */}
        <select
          value={employees.find(emp => emp.IdPersonnel === item.id)?.Equipe?.Id || ''}
          onChange={(e) => {
            if (onTeamChange) {
                const newGroupId = e.target.value ? Number(e.target.value) : null;
                onTeamChange(item.id, newGroupId);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full px-2 py-1 text-sm border border-default rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all cursor-pointer"
        >
          <option value="">Aucune équipe</option>
          {initialTeams.map(team => (
            <option key={team.Id} value={team.Id}>
              {team.Nom}
            </option>
          ))}
        </select>
      </div>
    ),
    type: (value: string) => {
      const typeColors: Record<string, string> = {
        'interim': 'bg-interim text-white',
        'employee': 'bg-employee text-white',
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
  };
};

// --- FACTORY DES CHAMPS CALCULÉS (MATHÉMATIQUES) ---

export const customComputedFieldsFactory = (
  viewType: string, 
  appointments: Appointment[]
) => {
  
  if (viewType !== 'chantier-table') return {};

  // Calcul de la Durée Planifiée (DPF)
  const calculateDPF = (chantierId: number): string => {
    const currentDate = new Date().setHours(0, 0, 0, 0);

    const relevantAppointments = appointments.filter(appointment => {
      if (appointment.Type !== 'Projet' || appointment.IdPlanningRessource !== chantierId) {
        return false;
      }
      // Prendre les RDV futurs ou en cours
      if (appointment.DebutPlanningEvenement >= currentDate) return true;
      if (appointment.DebutPlanningEvenement < currentDate && appointment.FinPlanningEvenement >= currentDate) return true;
      return false;
    });

    let totalHours = 0;

    relevantAppointments.forEach((appointment: Appointment) => {
      const startDate = appointment.DebutPlanningEvenement < currentDate ? currentDate : appointment.DebutPlanningEvenement;
      const endDate = appointment.FinPlanningEvenement;
      
      // Approximation simple (à affiner avec hoursPerDay si besoin)
      const timeDiff = endDate - startDate;
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + (timeDiff > 0 ? 0 : 1); // +1 pour inclure le jour même si nécessaire
      
      // Utilisation de la constante globale HOURS_PER_DAY
      totalHours += daysDiff * (HOURS_PER_DAY || 7); 
    });

    return `${Math.round(totalHours)}h`;
  };

  // Calcul du Reste à Faire + Réalisé (RPF)
  const calculateRPF = (chantier: any): string => {
    const hrValue = parseFloat((chantier.HR || '0')) || 0;
    const dpfString = calculateDPF(chantier.id);
    const dpfValue = parseFloat(dpfString) || 0;

    const totalRPF = hrValue + dpfValue;
    return `${Math.round(totalRPF)}h`;
  };

  // Calcul de l'Avancement % (AP)
  const calculateAP = (chantier: any): string => {
    const tmValue = parseFloat((chantier.TM || '0')) || 0;
    if (tmValue === 0) return '0%';

    const rpfString = calculateRPF(chantier);
    const rpfValue = parseFloat(rpfString) || 0;

    const percentage = Math.round((rpfValue / tmValue) * 100);
    return `${percentage}%`;
  };

  // Calcul du Solde Prévu (SP)
  const calculateSP = (chantier: any): string => {
    const tmValue = parseFloat(chantier.TM || '0') || 0;
    const rpfString = calculateRPF(chantier);
    const rpfValue = parseFloat(rpfString) || 0;

    const soldeHeures = tmValue - rpfValue;
    return `${Math.round(soldeHeures)}h`;
  };

  return {
    chantierTable: {
      DPF: (item: any) => calculateDPF(item.id),
      HR: (item: any) => `${Math.round(parseFloat(item?.HR || '0'))}h` || '0h',
      RPF: (item: any) => calculateRPF(item),
      SH: (item: any) => `${Math.round(parseFloat(item?.SH || '0'))}h` || '0h',
      AP: (item: any) => calculateAP(item),
      SP: (item: any) => calculateSP(item),
      TM: (item: any) => `${Math.round(parseFloat(item?.TM || '0'))}h` || '0h',
    },
    // Ajout vide pour typescript safety
    paieTable: {}, 
    employeeTable: {}
  };
};