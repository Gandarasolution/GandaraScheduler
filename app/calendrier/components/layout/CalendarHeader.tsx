import { format } from 'date-fns';
import { UserMenu } from '../index'; 

import LogoUrlN from "../../image/LOGO_couleur_police_noire.svg";
import LogoUrlB from "../../image/LOGO_couleur_police_blanche.svg";
import { Appointment, User } from '../../types';
import { memo, use, useEffect } from 'react';

interface CalendarHeaderProps {
  theme: string;
  user: any;
  viewState: any; // Type retourné par useCalendarView
  notifications: any; // Type retourné par useNotifications
  handleAddModal: (appointment: Appointment) => void;
  onNavigateDate: (date: number) => void;
}

export const CalendarHeader = memo(({ 
  theme, 
  user, 
  viewState, 
  notifications, 
  handleAddModal,
  onNavigateDate,
}: CalendarHeaderProps) => {
  
  // Déstructuration du viewState pour simplifier l'accès dans le JSX
  const {
    viewType, setViewType,
    isExpanded, setIsExpanded,
    searchInput, setSearchInput,
    isSettingsOpen, setIsSettingsOpen,
    isNotificationsPanelOpen, setIsNotificationsPanelOpen,
    isSearchOverlayOpen, setIsSearchOverlayOpen,
    isFilterModalOpen, setIsFilterModalOpen,
    isViewDropdownOpen, setIsViewDropdownOpen,
    viewDropdownRef,
    calendarConfigHook, // Pour ouvrir la modale de config calendrier
    
    
    // Toggles d'affichage
    isDisplayWeekend, setIsDisplayWeekend,
    isFullDay, setIsFullDay,
    
    // Date
    selectedDate, setSelectedDate
  } = viewState;



  return (
    <div className="flex flex-col items-center pr-9">
      <div className="flex flex-row w-full">
        {/* LOGO */}
        <div 
          className={`p-2 w-80 ${!isExpanded ? 'h-[80px]' : 'h-full'}`}
        >
          <img 
            src={theme === 'dark' ? LogoUrlB.src : LogoUrlN.src} 
            alt="Logo" 
            className="h-20 w-auto mb-2 cursor-pointer" 
            onClick={() => setViewType('calendar')}
          />
        </div>

        {/* BARRE CENTRALE (Recherche & Actions Globales) */}
        <div className={`flex-1 flex flex-col items-center justify-center py-4 h-[82px]`}>
          <div className="flex items-center justify-between w-full h-[50px]">
            
            {/* Barre de Recherche */}
            <div className="flex flex-col gap-1">
              <div className="relative w-72 max-w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400 bg-icon" aria-hidden="true" fill="none" viewBox="0 0 20 20">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                  </svg>
                </div>
                <input
                  type="search"
                  id="search"
                  className="block w-full p-3 pl-8 text-base placeholder:bg-icon bg-icon rounded-xl transition focus:outline-0 poppins text-[14px]"
                  placeholder="Rechercher"
                  value={searchInput || ""}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>

            {/* Boutons d'Actions (Droite) */}
            <div className="flex items-center gap-3">
              
              {/* Bouton Expansion */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10 cursor-pointer"
                title={isExpanded ? "Réduire" : "Options avancées"}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="25" 
                  height="25" 
                  fill="currentColor" 
                  className={`transition-transform duration-300 bi bi-chevron-up bg-icon ${!isExpanded ? 'rotate-180' : ''}`} 
                  viewBox="0 0 16 16"
                >
                  <path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z"/>
                </svg>
              </button>

              {/* Bouton Retour Planning (visible si hors calendar) */}
              {viewType !== 'calendar' && (
                <button
                  className="p-3 rounded-full hover:bg-primary-lighter transition cursor-pointer"
                  onClick={() => {setViewType('calendar')}}
                  title="Planning"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="20 20 60 60" width="25" height="25">
                    <defs>
                      <linearGradient width="100%" height="100%" id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00c6ff"/>
                        <stop offset="100%" stopColor="#0072ff"/>
                      </linearGradient>
                      <linearGradient width="100%" height="100%" id="gradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8e2de2"/>
                        <stop offset="100%" stopColor="#4a00e0"/>
                      </linearGradient>
                    </defs>
                    <path width="100%"  height="100%" d="M20 40 Q50 10 80 40 L60 50 Q40 60 20 40 Z" fill="url(#gradBlue)"/>
                    <path width="100%"  height="100%" d="M20 60 Q50 90 80 60 L60 50 Q40 40 20 60 Z" fill="url(#gradPurple)"/>
                  </svg>
                </button>
              )}

              {/* Bouton Paramètres */}
              <button
                className="p-3 rounded-full hover:bg-primary-lighter transition cursor-pointer"
                onClick={() => setIsSettingsOpen(true)}
                title="Paramètres"
              >
                <svg id="Glyph" enableBackground="new 0 0 32 32" height="25" viewBox="0 0 32 32" width="25" xmlns="http://www.w3.org/2000/svg" version="1.1" fill='currentColor' xmlnsXlink="http://www.w3.org/1999/xlink" className='bg-icon'>
                  <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                    <path id="XMLID_273_" d="m27.526 18.036-.526-.304c-.626-.361-1-1.009-1-1.732s.374-1.371 1-1.732l.526-.304c1.436-.83 1.927-2.662 1.098-4.098l-1-1.732c-.827-1.433-2.666-1.925-4.098-1.098l-.526.303c-.626.362-1.375.362-2 0-.626-.362-1-1.009-1-1.732v-.607c0-1.654-1.346-3-3-3h-2c-1.654 0-3 1.346-3 3v.608c0 .723-.374 1.37-1 1.732-.626.361-1.374.362-2 0l-.526-.304c-1.432-.827-3.271-.335-4.099 1.098l-1 1.732c-.829 1.436-.338 3.269 1.098 4.098l.527.304c.626.361 1 1.009 1 1.732s-.374 1.371-1 1.732l-.526.304c-1.436.829-1.927 2.662-1.098 4.098l1 1.732c.828 1.433 2.667 1.925 4.098 1.098l.526-.303c.626-.363 1.374-.361 2 0 .626.362 1 1.009 1 1.732v.607c0 1.654 1.346 3 3 3h2c1.654 0 3-1.346 3-3v-.608c0-.723.374-1.37 1-1.732.625-.361 1.374-.362 2 0l.526.304c1.432.826 3.271.334 4.098-1.098l1-1.732c.829-1.436.338-3.269-1.098-4.098zm-11.526 2.964c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5-2.243 5-5 5z" />
                  </g>
                </svg>
              </button>

              {/* Menu Sélection de Vue */}
              <div className="relative" ref={viewDropdownRef}>
                <button
                  className="p-3 rounded-full hover:bg-primary-lighter transition cursor-pointer"
                  onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                  title="Changer de vue"
                >
                  <svg id="Layer_1" enableBackground="new 0 0 512 512" height="25" viewBox="0 0 512 512" width="25" xmlns="http://www.w3.org/2000/svg" version="1.1" fill='currentColor' xmlnsXlink="http://www.w3.org/1999/xlink" className='bg-icon'>
                    <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                      <path clipRule="evenodd" d="m40.583 21h71.806c10.771 0 19.583 8.812 19.583 19.583v71.806c0 10.771-8.812 19.583-19.583 19.583h-71.806c-10.771 0-19.583-8.812-19.583-19.583v-71.806c0-10.771 8.812-19.583 19.583-19.583zm159.931 19.583v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm-359.028 179.514v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm-359.028 179.514v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583zm179.514 0v71.806c0 10.771 8.812 19.583 19.583 19.583h71.806c10.771 0 19.583-8.812 19.583-19.583v-71.806c0-10.771-8.812-19.583-19.583-19.583h-71.806c-10.771 0-19.583 8.812-19.583 19.583z"/>
                    </g>
                  </svg>
                </button>

                {/* Dropdown Content */}
                {isViewDropdownOpen && (
                  <div className="absolute top-full -left-30 mt-2 w-56 bg-bg-secondary rounded-2xl shadow-2xl border-gray-100 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 bg-gradient-to-r from-primary to-primary-dark text-white">
                      <h3 className="text-sm font-semibold">Changer de vue</h3>
                      <p className="text-xs text-white/80 mt-1">Sélectionnez votre mode d'affichage</p>
                    </div>
                    
                    <div className="py-2">
                      {/* Option: Calendrier */}
                      <button
                        className={`w-full px-4 py-3 text-left flex items-center gap-4 transition-all duration-200 group ${viewType === 'calendar' ? 'bg-primary-lighter text-primary shadow-sm' : 'text-primary hover:bg-primary-ultra-light hover:shadow-sm'}`}
                        onClick={() => { setViewType('calendar'); setIsViewDropdownOpen(false); }}
                      >
                        <div className={`p-2 rounded-xl transition-all duration-200 ${viewType === 'calendar' ? 'bg-primary text-white' : 'group-hover:bg-primary group-hover:text-white'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Planning</div>
                          <div className="text-xs text-primary mt-0.5">Vue calendrier avec timeline</div>
                        </div>
                        {viewType === 'calendar' && <div className="p-1 rounded-full bg-primary"><svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg></div>}
                      </button>
                      
                      <div className="mx-4 my-2 h-px bg-primary-lighter"></div>

                      {/* Option: Chantier Table */}
                      <button
                        className={`w-full px-4 py-3 text-left flex items-center gap-4 transition-all duration-200 group ${viewType === 'chantier-table' ? 'bg-primary-lighter text-primary shadow-sm' : 'text-primary hover:bg-primary-ultra-light hover:shadow-sm'}`}
                        onClick={() => { setViewType('chantier-table'); setIsViewDropdownOpen(false); }}
                      >
                        <div className={`p-2 rounded-xl transition-all duration-200 ${viewType === 'chantier-table' ? 'bg-primary text-white' : 'group-hover:bg-primary group-hover:text-white'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zM1 2v2h4V2H1zm4 3H1v3h4V5zm0 4H1v3h4V9zm0 4H1v2a1 1 0 0 0 1 1h3v-3zm5-8H6v3h4V4zm0 4H6v3h4V8z" /></svg>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Liste des chantiers</div>
                          <div className="text-xs text-primary mt-0.5">Vue tableau avec filtres</div>
                        </div>
                        {viewType === 'chantier-table' && <div className="p-1 rounded-full bg-primary"><svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg></div>}
                      </button>

                      {/* Option: Paie Table */}
                      <button
                        className={`w-full px-4 py-3 text-left flex items-center gap-4 transition-all duration-200 group ${viewType === 'paie-table' ? 'bg-primary-lighter text-primary shadow-sm' : 'text-primary hover:bg-primary-ultra-light hover:shadow-sm'}`}
                        onClick={() => { setViewType('paie-table'); setIsViewDropdownOpen(false); }}
                      >
                        <div className={`p-2 rounded-xl transition-all duration-200 ${viewType === 'paie-table' ? 'bg-primary text-white' : 'group-hover:bg-primary group-hover:text-white'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3zm13-1H2a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM2 5v7h12V5H2z"/><path d="M6 8a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 6 8zm0 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z"/></svg>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Rubrique Sociale</div>
                          <div className="text-xs text-primary mt-0.5">Gestion des éléments de paie</div>
                        </div>
                        {viewType === 'paie-table' && <div className="p-1 rounded-full bg-primary"><svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg></div>}
                      </button>
                      {/* Option: Événements manuels */}
                      <button
                        className={`w-full px-4 py-3 text-left flex items-center gap-4 transition-all duration-200 group ${viewType === 'manual-event-table' ? 'bg-primary-lighter text-primary shadow-sm' : 'text-primary hover:bg-primary-ultra-light hover:shadow-sm'}`}
                        onClick={() => { setViewType('manual-event-table'); setIsViewDropdownOpen(false); }}
                      >
                        <div className={`p-2 rounded-xl transition-all duration-200 ${viewType === 'manual-event-table' ? 'bg-primary text-white' : 'group-hover:bg-primary group-hover:text-white'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16a1 1 0 011 1v10a1 1 0 01-1 1h-6.586l-3.707 3.707A1 1 0 018 19v-3H4a1 1 0 01-1-1V5a1 1 0 011-1zm1 2v8h4a1 1 0 011 1v1.586L12.586 15H19V6H5zm2 2h10v2H7V8zm0 3h7v2H7v-2z"/></svg>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Événements manuels</div>
                          <div className="text-xs text-primary mt-0.5">Créer et gérer les rubriques personnalisées</div>
                        </div>
                        {viewType === 'manual-event-table' && <div className="p-1 rounded-full bg-primary"><svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg></div>}                     
                      </button>
                      {/* Option: Employee Table */}
                      <button
                        className={`w-full px-4 py-3 text-left flex items-center gap-4 transition-all duration-200 group ${viewType === 'employee-table' ? 'bg-primary-lighter text-primary shadow-sm' : 'text-primary hover:bg-primary-ultra-light hover:shadow-sm'}`}
                        onClick={() => { setViewType('employee-table'); setIsViewDropdownOpen(false); }}
                      >
                        <div className={`p-2 rounded-xl transition-all duration-200 ${viewType === 'employee-table' ? 'bg-primary text-white' : 'group-hover:bg-primary group-hover:text-white'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Liste des employées</div>
                          <div className="text-xs text-primary mt-0.5">Gestion des employée</div>
                        </div>
                        {viewType === 'employee-table' && <div className="p-1 rounded-full bg-primary"><svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg></div>}
                      </button>
                    </div>
                    <div className="px-4 py-2 bg-transparent border-t border-light">
                      <p className="text-xs text-primary text-center">Raccourci : <span className="font-mono bg-transparent px-1 rounded">Ctrl + Q</span></p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bouton Notifications */}
              <button
                className="p-3 rounded-full hover:bg-primary-lighter transition relative cursor-pointer"
                onClick={() => setIsNotificationsPanelOpen(!isNotificationsPanelOpen)}
                title="Notifications"
              >
                <div className="relative">
                  <svg id="Layer_1" enableBackground="new 0 0 100 100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="25" height="25" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" fill='currentColor' className='bg-icon'>
                    <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                      <path d="m84.9384384 78.6478882h-69.8768778c-4.2446356 0-6.8042536-4.7139664-4.4792337-8.2760315l4.8991413-7.4587746c2.6900654-4.0955315 4.1233788-8.8885002 4.1233788-13.7884827v-6.9935493c0-14.3977032 10.0250931-26.4705181 23.462925-29.5846062v-3.1142158c-.0000001-3.8393617 3.1142158-6.9322281 6.932228-6.9322281 1.9197464 0 3.6474648.7678463 4.9058571 2.0263696 1.237175 1.2583933 2.026371 2.9861126 2.026371 4.9058585v3.1142168c5.631134 1.2797441 10.622261 4.1380129 14.5683823 8.0839968 5.5030289 5.5031605 8.8945465 13.0966091 8.8945465 21.5006084v6.9935493c0 4.8999825 1.4333115 9.6929512 4.1233749 13.7884827l4.8991394 7.4587746c2.3250198 3.5620651-.2345962 8.2760315-4.4792328 8.2760315z"/>
                      <path d="m50.0000114 97.5h-.0000229c-6.6999817 0-12.1313858-5.4314041-12.1313858-12.1313858v-.4888229h24.2627945v.4888229c0 6.6999817-5.4314041 12.1313858-12.1313858 12.1313858z"/>
                    </g>
                  </svg>
                  {notifications.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
                  )}
                </div>
              </button>

              {/* Menu Utilisateur */}
              <div className="p-4 transition relative">
                <UserMenu user={user} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BARRE D'OUTILS INFERIEURE (Titres, Filtres, Date) - Visible si Expanded */}
      <div className={`flex items-center justify-between w-full ${!isExpanded ? 'hidden' : 'h-[50px]'}`}>
        <div className={`${viewType === 'calendar' ? 'ml-80' : 'ml-7'}`}>
          <p className="text-5xl poppins text-primary">
            {
              viewType === 'calendar' ? 'Planning' 
              : viewType === 'chantier-table' ? 'Liste des chantiers' 
              : viewType === 'paie-table' ? 'Rubrique Paie' 
              : viewType === 'manual-event-table' ? 'Rubrique personnalisée' 
              : 'Liste des employées'
            }
          </p>
        </div>
        
        <div className="flex flex-row items-center gap-4">
          <div className="flex flex-row items-center gap-2">
            {viewType === 'calendar' && (
              <input
                id="date-select"
                type="date"
                className="date-input border w-38 border-default rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-color transition bg-bg-secondary text-base text-primary"
                value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const date = new Date(e.target.value).setHours(0,0,0,0);                  
                  if (isNaN(date)) return;
                  setSelectedDate(date);
                  onNavigateDate(date);
                }}
              />
            )}
          </div>


          {/* Toggle Weekend / Full Day / Filtres */}
          <div className="border border-default rounded-xl flex items-center multi-op">
            {viewType === 'calendar' && (
              <>
                <button
                  className="transition btn-header cursor-pointer border-r border-default px-3 py-2"
                  onClick={() => setIsDisplayWeekend(!isDisplayWeekend)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className={"bg-icon bi bi-calendar-event transition duration-200 " + (!isDisplayWeekend ? ' text-color-primary' : 'text-gray-500')} viewBox="0 0 16 16">
                    <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z" fillOpacity="1" stroke="none" strokeOpacity="1"/>
                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z" fillOpacity="1" stroke="none" strokeOpacity="1"/>
                  </svg>
                </button>
                <button 
                  className="transition cursor-pointer btn-header border-r border-default px-3 py-2"
                  onClick={() => setIsFullDay(!isFullDay)}
                >
                  {!isFullDay ? (
                    <svg id="Layer_1" enableBackground="new 0 0 32 32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="20" height="20" version="1.1" fill='currentColor' className='bg-icon' xmlnsXlink="http://www.w3.org/1999/xlink">
                      <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                        <path d="m27 3v26c0 .5527344-.4472656 1-1 1h-8c-.5527344 0-1-.4472656-1-1v-26c0-.5527344.4472656-1 1-1h8c.5527344 0 1 .4472656 1 1zm-13-1h-8c-.5527344 0-1 .4472656-1 1v26c0 .5527344.4472656 1 1 1h8c.5527344 0 1-.4472656 1-1v-26c0-.5527344-.4472656-1-1-1z"/>
                      </g>
                    </svg>
                  ) : (
                    <svg id="Layer_1" height="20" viewBox="0 0 512 512" width="20" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1" version="1.1" xmlnsXlink="http://www.w3.org/1999/xlink" fill='currentColor' className='bg-icon'>
                      <g width="100%" height="100%" transform="matrix(1,0,0,1,0,0)">
                        <rect height="480" rx="10.695" width="108.343" x="201.828" y="16"/>
                      </g>
                    </svg>
                  )}
                </button>
              </>
            )}
            <>
              <button 
                className="transition btn-header px-3 py-2 group hover:text-[#00947f] cursor-pointer text-gray-400"
                name="filtrer"
                onClick={() => viewType === 'calendar' ? calendarConfigHook.openConfigModal() : setIsFilterModalOpen(true)}
                title="Filtrer"
              >
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bg-icon w-5 h-5 text-inherit text-gray-500 transition duration-200">
                  <g><path d="m6.5 16c-.072 0-.145-.016-.212-.047-.176-.082-.288-.259-.288-.453v-6.285c0-.346-.121-.683-.34-.951l-5.434-6.63c-.145-.178-.226-.404-.226-.634 0-.551.449-1 1-1h14c.551 0 1 .449 1 1 0 .23-.081.456-.227.634l-5.434 6.63c-.218.268-.339.605-.339.951v2.849c0 .744-.328 1.444-.9 1.92l-2.28 1.9c-.091.076-.205.116-.32.116zm8.5-15h.01z"/></g>
                </svg>
              </button>
            </>
            
          </div>

          {/* Bouton Ajouter Évènement */}
          {(viewType === 'calendar' || viewType === 'manual-event-table') && (
            <button
              className="transition px-3 py-2 rounded-2xl cursor-pointer text-white font-semibold shadow active:scale-95 pointer-events-auto bg-primary-light"
              type="button"
              onClick={() => 
                viewType === 'calendar' 
                  ? setIsSearchOverlayOpen(true) 
                  : handleAddModal({
                    id: -1,
                    description: '',
                    startDate: 0,
                    endDate: 1,
                    employee: {} as User,
                    type: 'autre',
                    EventId: 0,
                  })
              }
              title={viewType === 'calendar' ? "Ajouter un évènement" : "Ajouter une ressource"}
            >
              {viewType === 'calendar' ? "+ Ajouter un évènement" : "+ Ajouter une ressource"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});