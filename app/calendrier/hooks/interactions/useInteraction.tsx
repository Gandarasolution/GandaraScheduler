import React, { useState, useCallback } from 'react';
import { Appointment, User, type Image } from '@/app/calendrier';

// Interface complète des props
interface InteractionProps {
  selectedAppointment: Appointment | null;
  setSelectedAppointment: (app: Appointment | null) => void;
  selectedCell: { employeeId: number; date: number } | null;
  setSelectedCell: (cell: { employeeId: number; date: number } | null) => void;
  setSelectedEmployee: (employee: User | null) => void;
  
  // Actions provenant de useAppointmentLogic
  copyAppointment: (app: Appointment) => void;
  pasteAppointment: (cell?: { employeeId: number; date: number } | null) => void;
  undoAction: () => void;
  deleteAction: (appointment?: Appointment) => void;
  
  // Actions UI & Modales
  openSearch: () => void;
  handleOpenEditModal: (app: Appointment) => void;
  
  // Actions spécifiques au ContextMenu
  handleRepeat: () => void;
  handleExtend: () => void;
  handleDivide: (appointment: Appointment) => void;
  
  // Configuration pour la logique "Diviser"
  isFullDay: boolean;
  DAY_INTERVALS: { startHour: number; endHour: number }[];
  HALF_DAY_INTERVALS: { startHour: number; endHour: number }[];

  viewType: string;
  addImage: (newImage: Image) => Image;

  setIsViewDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useInteraction = ({
    selectedAppointment, setSelectedAppointment,
    selectedCell, setSelectedCell, setSelectedEmployee,
    copyAppointment, pasteAppointment,
    undoAction, deleteAction, openSearch,
    handleOpenEditModal,
    handleRepeat, handleExtend, handleDivide,
    isFullDay, DAY_INTERVALS, HALF_DAY_INTERVALS,
    viewType,
    addImage,
    setIsViewDropdownOpen
}: InteractionProps) => {

  // --- ÉTATS LOCAUX ---
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number, item: any[] } | null>(null);
  
  // États pour le sélecteur d'image
  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // --- GESTION MENU CONTEXTUEL ---

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleContextMenu = useCallback((e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => {
    e.preventDefault();
    e.stopPropagation();

    console.log(cell);
    
    const items: any[] = [];

    // 1. Clic Droit sur un RENDEZ-VOUS
    if (origin === 'appointment' && appointment && cell) {
        setSelectedAppointment(appointment);
        setSelectedCell(cell);
        
        // Item: Modifier
        items.push({
          label: "Modifier",
          logo: <svg height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg" fill="var(--contraste-max)"><g id="Layer_2" data-name="Layer 2"><path d="m3.05 21.77a1.22 1.22 0 0 1 -.88-.36 1.28 1.28 0 0 1 -.33-1.19l1.16-4.58a1.61 1.61 0 0 1 .46-.81l13.23-13.25a2.82 2.82 0 0 1 3.89 0l1.42 1.42a2.75 2.75 0 0 1 0 3.88l-13.25 13.25a1.77 1.77 0 0 1 -.81.46l-4.58 1.14a1.1 1.1 0 0 1 -.31.04zm15.58-19.5a1.22 1.22 0 0 0 -.88.37l-13.24 13.24a.37.37 0 0 0 -.07.12l-1 4.18 4.18-1.05a.24.24 0 0 0 .11-.06l13.2-13.25a1.24 1.24 0 0 0 0-1.76l-1.41-1.42a1.26 1.26 0 0 0 -.89-.37z"/><path d="m19.62 8.94a.74.74 0 0 1 -.53-.22l-4.24-4.24a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06.74.74 0 0 1 -.53.22z"/></g></svg>,
          action: () => handleOpenEditModal(appointment)
        });
        
        // Item: Supprimer
        items.push({ 
          label: "Supprimer", 
          logo: <svg id="Layer_1" enableBackground="new 0 0 512 512" height="24" viewBox="0 0 512 512" width="24" xmlns="http://www.w3.org/2000/svg" fill="var(--contraste-max)"><g><path d="m479.867 111.4c0-25.99-21.145-47.134-47.135-47.134h-81.398v-9.101c0-30.417-24.748-55.165-55.168-55.165h-80.332c-30.42 0-55.168 24.748-55.168 55.166v9.101h-81.4c-25.989 0-47.133 21.144-47.133 47.134 0 20.745 13.478 38.39 32.133 44.671v300.761c0 30.419 24.748 55.167 55.167 55.167h273.133c30.419 0 55.166-24.748 55.166-55.167v-300.761c18.657-6.281 32.135-23.926 32.135-44.672zm-289.201-56.234c0-13.876 11.291-25.166 25.168-25.166h80.332c13.878 0 25.168 11.29 25.168 25.166v9.101h-130.668zm201.9 426.834h-273.132c-13.877 0-25.167-11.29-25.167-25.167v-298.3h323.466v298.3c-.001 13.877-11.29 25.167-25.167 25.167zm40.166-353.467h-353.466c-9.447 0-17.133-7.686-17.133-17.133 0-9.448 7.686-17.134 17.133-17.134h353.466c9.448 0 17.135 7.686 17.135 17.134s-7.686 17.133-17.135 17.133z"/><path d="m167.633 192.8c-8.284 0-15 6.716-15 15v224.934c0 8.284 6.716 15 15 15s15-6.716 15-15v-224.934c0-8.284-6.716-15-15-15z"/><path d="m256 192.8c-8.284 0-15 6.716-15 15v224.934c0 8.284 6.716 15 15 15s15-6.716 15-15v-224.934c0-8.284-6.716-15-15-15z"/><path d="m344.367 192.8c-8.284 0-15 6.716-15 15v224.934c0 8.284 6.716 15 15 15s15-6.716 15-15v-224.934c0-8.284-6.716-15-15-15z"/></g></svg>,
          action: () => deleteAction(appointment)
        });
        
        // Item: Copier
        items.push({ 
            label: "Copier", 
            logo: <svg id="Layer_1" height="24" viewBox="0 0 512 512" width="24" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1" fill="var(--contraste-max)"><path d="m397.943 83.923h-11.735v-18.6a65.393 65.393 0 0 0 -65.319-65.323h-206.833a65.393 65.393 0 0 0 -65.319 65.319v297.439a65.393 65.393 0 0 0 65.319 65.319h11.736v18.6a65.393 65.393 0 0 0 65.319 65.323h206.832a65.393 65.393 0 0 0 65.32-65.319v-297.439a65.393 65.393 0 0 0 -65.32-65.319zm-283.887 308.154a29.353 29.353 0 0 1 -29.319-29.319v-297.439a29.352 29.352 0 0 1 29.319-29.319h206.833a29.352 29.352 0 0 1 29.319 29.319v18.6h-159.1a65.393 65.393 0 0 0 -65.319 65.319v242.839zm313.207 54.6a29.352 29.352 0 0 1 -29.32 29.323h-206.832a29.352 29.352 0 0 1 -29.319-29.319v-297.439a29.352 29.352 0 0 1 29.319-29.319h206.832a29.353 29.353 0 0 1 29.32 29.319z"/></svg>,
            action: () => copyAppointment(appointment)
        });

        // Item: Répéter
        items.push({
          label: 'Répéter',
          logo: <svg id="SVGRoot" height="24" viewBox="0 0 48 48" width="24" xmlns="http://www.w3.org/2000/svg" fill="var(--contraste-max)"><path id="path4" d="m17 13c-6.0767 0-11 4.9233-11 11 0 2.3837.7554356 4.597737 2.0410156 6.398438a1.0001 1.0001 0 1 0 1.6269532-1.16211c-1.0515-1.4729-1.6679688-3.273728-1.6679688-5.236328 0-5.0033 3.9967-9 9-9h10v-2z" /><path id="path6" d="m39.101562 17.171875a1.0001 1.0001 0 0 0 -.769531 1.591797c1.0515 1.4729 1.667969 3.273728 1.667969 5.236328 0 5.0033-3.9967 9-9 9h-10v2h10c6.0767 0 11-4.9233 11-11 0-2.3837-.755436-4.597737-2.041016-6.398438a1.0001 1.0001 0 0 0 -.857422-.429687z" /><path id="path8-1" d="m27.0194 9.0005a.99994 1 0 0 0 -1.0194.9999v7.9992a.99994 1 0 0 0 1.4959.86906l6.9989-3.9996a.99994 1 0 0 0 0-1.7381l-6.9989-3.9996a.99994 1 0 0 0 -.47649-.13085zm.98031 2.7243 3.9818 2.2752-3.9818 2.2752z" /><path id="path845" d="m20.980645 29.0005a.99994 1 0 0 1 1.0194.9999v7.9992a.99994 1 0 0 1 -1.4959.86906l-6.9989-3.9996a.99994 1 0 0 1 0-1.7381l6.9989-3.9996a.99994 1 0 0 1 .47649-.13085zm-.98031 2.7243-3.9818 2.2752 3.9818 2.2752z" /></svg>,
          action: handleRepeat
        });

        // Item: Prolonger
        items.push({
          label: 'Prolonger',
          logo: <svg id="Layer_1" enableBackground="new 0 0 512 512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width='20' height='20' fill="var(--contraste-max)"><g id="Layer_2_00000183934888366482681160000007864504227170276480_"><g id="Layer_1_copy_10"><g id="_21"><path d="m384.8 148.1c6.3 0 12.4 2.5 16.9 7l84.1 84.1c9.3 9.3 9.3 24.4 0 33.8l-83.8 83.9c-9.3 9.3-24.4 9.3-33.8 0s-9.3-24.4 0-33.8l9.3-9.3c7.5-7.5 7.5-19.6 0-27.1-3.6-3.6-8.5-5.6-13.5-5.6h-321c-13.2 0-23.9-10.7-23.9-23.9s10.7-23.9 23.9-23.9h323.2c10.6 0 19.2-8.6 19.2-19.1 0-5.1-2-10-5.6-13.6l-11.8-11.7c-9.3-9.3-9.3-24.4 0-33.7 4.5-4.6 10.5-7.1 16.8-7.1m.1-19.1c-23.7 0-43 19.2-43 43 0 11.4 4.5 22.4 12.6 30.5l11.7 11.8h-323.2c-23.8 0-43 19.3-43 43s19.3 43 43 43h321l-9.3 9.3c-8.1 8-12.6 19-12.6 30.4 0 23.7 19.2 43 42.9 43.1 11.5 0 22.4-4.5 30.5-12.6l83.9-83.9c16.8-16.8 16.8-44 0-60.8l-84.1-84.1c-8.1-8.2-19-12.8-30.4-12.7z"/></g></g></g></svg>,
          action: handleExtend
        });

        // Item: Diviser (Conditionnel)
        const duration = appointment.FinPlanningEvenement - appointment.DebutPlanningEvenement;
        const intervalDuration = isFullDay 
          ? (DAY_INTERVALS[0].endHour - DAY_INTERVALS[0].startHour) * 3600000 
          : (HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour) * 3600000;

        const canDivide = duration <= intervalDuration;
        
        items.push({
          label: 'Diviser',
          logo: <svg fill="var(--contraste-max)" height="20" viewBox="0 0 191 177" width="21" xmlns="http://www.w3.org/2000/svg"><g><path d="m95.5.34375c-1.7985 0-3.5233.71445-4.7951 1.98618-1.2717 1.27173-1.9861 2.99657-1.9861 4.79507v10.1719c0 1.7985.7144 3.5233 1.9861 4.795 1.2718 1.2718 2.9966 1.9862 4.7951 1.9862s3.5233-.7144 4.795-1.9862c1.272-1.2717 1.986-2.9965 1.986-4.795v-10.1719c0-1.7985-.714-3.52334-1.986-4.79507-1.2717-1.27173-2.9965-1.98618-4.795-1.98618z"/><path d="m95.5 42.1841c-1.7985 0-3.5233.7144-4.7951 1.9862-1.2717 1.2717-1.9861 2.9965-1.9861 4.795v23.7344c0 1.7985.7144 3.5233 1.9861 4.7951 1.2718 1.2717 2.9966 1.9862 4.7951 1.9862s3.5233-.7145 4.795-1.9862c1.272-1.2718 1.986-2.9966 1.986-4.7951v-23.7344c0-1.7985-.714-3.5233-1.986-4.795-1.2717-1.2718-2.9965-1.9862-4.795-1.9862z"/><path d="m95.5 97.519c-1.7985 0-3.5233.7145-4.7951 1.9862-1.2717 1.2718-1.9861 2.9968-1.9861 4.7948v23.735c0 1.798.7144 3.523 1.9861 4.795 1.2718 1.271 2.9966 1.986 4.7951 1.986s3.5233-.715 4.795-1.986c1.272-1.272 1.986-2.997 1.986-4.795v-23.735c0-1.798-.714-3.523-1.986-4.7948-1.2717-1.2717-2.9965-1.9862-4.795-1.9862z"/><path d="m95.5 152.922c-1.7985 0-3.5233.714-4.7951 1.986-1.2717 1.272-1.9861 2.997-1.9861 4.795v10.172c0 1.799.7144 3.523 1.9861 4.795 1.2718 1.272 2.9966 1.986 4.7951 1.986s3.5233-.714 4.795-1.986c1.272-1.272 1.986-2.996 1.986-4.795v-10.172c0-1.798-.714-3.523-1.986-4.795-1.2717-1.272-2.9965-1.986-4.795-1.986z"/><path d="m67.5617 24.8241c-2.2114-1.791-4.8033-3.0521-7.5773-3.6868-2.7739-.6347-5.6563-.6262-8.4265.0249l-35.9406 8.4088c-4.3482 1.0731-8.20408 3.5885-10.93829 7.1356-2.73422 3.5471-4.185215 7.9163-4.116104 12.3944v87.207c-.002169 3.045.679114 6.051 1.993604 8.797 1.3145 2.747 3.22868 5.163 5.6014 7.071 3.32719 2.671 7.46469 4.13 11.73159 4.137 1.4377.01 2.8717-.15 4.2722-.475l35.9406-8.409c4.3481-1.073 8.204-3.588 10.9383-7.136 2.7342-3.547 4.1852-7.916 4.1161-12.394v-46.1802c0-1.7985-.7145-3.5234-1.9862-4.7951-1.2718-1.2717-2.9966-1.9862-4.7951-1.9862s-3.5233.7145-4.7951 1.9862c-1.2717 1.2717-1.9861 2.9966-1.9861 4.7951v46.1802c.0519 1.417-.3749 2.809-1.2115 3.953-.8366 1.145-2.0343 1.974-3.3998 2.354l-36.0762 8.544c-.7796.168-1.5871.158-2.3621-.03-.7751-.188-1.4976-.548-2.1136-1.055-.7586-.665-1.3593-1.491-1.7581-2.418-.3989-.927-.5859-1.931-.5475-2.939v-87.207c-.0519-1.4165.3749-2.8092 1.2115-3.9533.8366-1.1442 2.0342-1.9732 3.3998-2.3533l36.0762-8.5444c.7796-.1682 1.5871-.158 2.3621.0299s1.4976.5486 2.1135 1.0551c.8057.7009 1.4345 1.5821 1.8351 2.572.4007.9898.5619 2.0603.4706 3.1243v13.5625c0 1.7985.7144 3.5233 1.9861 4.795 1.2718 1.2718 2.9966 1.9862 4.7951 1.9862s3.5233-.7144 4.7951-1.9862c1.2717-1.2717 1.9862-2.9965 1.9862-4.795v-13.5625c.0535-3.1018-.603-6.1747-1.9194-8.9837-1.3164-2.8091-3.2578-5.2799-5.6756-7.2235z"/><path d="m175.384 29.571-35.94-8.4088c-2.771-.6511-5.653-.6596-8.427-.0249s-5.366 1.8958-7.577 3.6868c-2.418 1.9436-4.359 4.4144-5.676 7.2235-1.316 2.809-1.973 5.8819-1.919 8.9837v86.8677c-.069 4.478 1.382 8.847 4.116 12.394 2.734 3.548 6.59 6.063 10.938 7.136l10.511 2.441c1.754.414 3.6.114 5.132-.833 1.533-.948 2.626-2.465 3.04-4.219.413-1.753.113-3.599-.834-5.132-.948-1.532-2.465-2.625-4.218-3.039l-10.511-2.441c-1.366-.38-2.564-1.209-3.4-2.354-.837-1.144-1.264-2.536-1.212-3.953v-86.8677c-.001-.9963.217-1.9806.639-2.8831.421-.9025 1.037-1.7009 1.803-2.3385.558-.5708 1.239-1.0076 1.991-1.2777.751-.2702 1.554-.3665 2.349-.282l35.94 8.4088c1.366.3801 2.563 1.209 3.4 2.3532s1.263 2.5369 1.211 3.9533v87.3427c.002.996-.216 1.98-.638 2.883-.422.902-1.037 1.701-1.803 2.338-.573.492-1.245.856-1.97 1.066-.725.211-1.487.263-2.234.155-1.754-.414-3.6-.114-5.132.834-1.533.947-2.626 2.465-3.04 4.218-.413 1.754-.113 3.6.834 5.132.948 1.533 2.465 2.626 4.218 3.039 1.401.326 2.835.485 4.273.475 4.266-.006 8.404-1.465 11.731-4.136 2.366-1.936 4.265-4.38 5.557-7.151 1.291-2.77 1.941-5.797 1.903-8.853v-87.207c.069-4.4781-1.382-8.8473-4.117-12.3944-2.734-3.5471-6.59-6.0625-10.938-7.1356z"/></g></svg>,
          action: () => handleDivide(appointment),
          actif: canDivide
        });
        
        // Item: Coller
        items.push({
            label: 'Coller',
            logo: <svg xmlns="http://www.w3.org/2000/svg" id="Layer_2" data-name="Layer 2" viewBox="0 0 100 100" width="20" height="20" fill="var(--contraste-max)"><path d="M82.5,12.5h-10A8.58,8.58,0,0,0,63.72,5H48.78A8.58,8.58,0,0,0,40,12.5H30A2.5,2.5,0,0,0,27.5,15V27.5h-10A2.5,2.5,0,0,0,15,30V92.5A2.5,2.5,0,0,0,17.5,95h50A2.5,2.5,0,0,0,70,92.5V80H82.5A2.5,2.5,0,0,0,85,77.5V15A2.5,2.5,0,0,0,82.5,12.5ZM45,13.21A3.54,3.54,0,0,1,48.78,10H63.72a3.54,3.54,0,0,1,3.78,3.21V17.5H45ZM65,90H20V32.5H46v16a2.5,2.5,0,0,0,2.5,2.5H65V90ZM61.35,46H51V35.92ZM80,75H70V48.53a2.56,2.56,0,0,0-.76-1.79l-19-18.53a2.57,2.57,0,0,0-1.74-.71h-16v-10H40V20a2.5,2.5,0,0,0,2.5,2.5H70A2.5,2.5,0,0,0,72.5,20V17.5H80Z"/></svg>,
            action: () => pasteAppointment(cell)
        });

        // Item: Ajouter
        items.push({
          label: 'Ajouter',
          logo: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-plus-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3z"/></svg>,
          action: openSearch
        });
    } 
    
    // 2. Clic Droit sur une CELLULE VIDE
    else if (origin === 'cell' && cell) {
        setSelectedCell(cell);
        
        // Item: Coller
        items.push({ 
            label: "Coller", 
            logo: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-copy" viewBox="0 0 16 16"><path fillRule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/></svg>,
            action: () => pasteAppointment(cell)
        });
        
        // Item: Ajouter
        items.push({ 
          label: "Ajouter", 
          logo: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-plus-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3z"/></svg>,
          action: openSearch
        });
    }

    if (items.length > 0) {
        setContextMenu({ x: e.clientX, y: e.clientY, item: items });
    }
  }, [deleteAction, copyAppointment, pasteAppointment, openSearch, handleOpenEditModal, isFullDay, DAY_INTERVALS, HALF_DAY_INTERVALS, setSelectedAppointment, setSelectedCell, handleRepeat, handleExtend, handleDivide]);

  // --- GESTION CLAVIER GLOBAL ---

  const handleGlobalKeyboard = useCallback((e: KeyboardEvent) => {
      if (e.ctrlKey) {
          switch(e.key.toLocaleLowerCase()) {
              case 'c' : 
                  if (selectedAppointment) {
                       copyAppointment(selectedAppointment);
                  }
                  break;
              case 'v':
                  if (selectedCell) {
                    pasteAppointment(selectedCell);
                  }
                  break;
              case 'z':
                  e.preventDefault();
                  undoAction();
                  break;
              case 'f':
                  e.preventDefault();
                  // Fermer les autres interfaces si ouvertes
                  setContextMenu(null);
                  setIsImageSelectorOpen(false);
                  openSearch();
                  break;
              case 'q':
                  e.preventDefault();
                  setIsViewDropdownOpen(prev => !prev);
                  break;
          }
      } else if ((e.key === 'Delete' || e.key === 'rubout') && selectedAppointment) {
          deleteAction(selectedAppointment);
      }
  }, [selectedAppointment, selectedCell, copyAppointment, pasteAppointment, undoAction, deleteAction, openSearch, setIsViewDropdownOpen]);

  // --- GESTION CLIC DROIT TABLEAUX (DataTableFrame) ---
  
  const handleDataTableContextMenu = useCallback((item: any, e: React.MouseEvent) => {
      e.preventDefault();
      const items = [{
        label: "Modifier",
        logo: <svg height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><g id="Layer_2" data-name="Layer 2"><path d="m3.05 21.77a1.22 1.22 0 0 1 -.88-.36 1.28 1.28 0 0 1 -.33-1.19l1.16-4.58a1.61 1.61 0 0 1 .46-.81l13.23-13.25a2.82 2.82 0 0 1 3.89 0l1.42 1.42a2.75 2.75 0 0 1 0 3.88l-13.25 13.25a1.77 1.77 0 0 1 -.81.46l-4.58 1.14a1.1 1.1 0 0 1 -.31.04zm15.58-19.5a1.22 1.22 0 0 0 -.88.37l-13.24 13.24a.37.37 0 0 0 -.07.12l-1 4.18 4.18-1.05a.24.24 0 0 0 .11-.06l13.2-13.25a1.24 1.24 0 0 0 0-1.76l-1.41-1.42a1.26 1.26 0 0 0 -.89-.37z"/><path d="m19.62 8.94a.74.74 0 0 1 -.53-.22l-4.24-4.24a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06.74.74 0 0 1 -.53.22z"/></g></svg>,
        action: () => {
          if(viewType === 'employee-table') { 
             // C'est un employé (ou item avec image sans type d'événement clair)
             handleOpenImageModal(item.id);
          } else {
             // C'est un événement, on ouvre le formulaire d'édition
             // On simule un RDV temporaire pour ouvrir la modale
             const mockApp: Appointment = {
                 IdPlanningEvenement: 0,
                 AnnotationPlanningEvenement: '',
                 Type: item.type,
                 IdPlanningRessource: item.IdPlanningRessource,
                 DebutPlanningEvenement: Date.now(),
                 FinPlanningEvenement: Date.now(),
                IdEmploye: item.IdEmploye,
             };
             handleOpenEditModal(mockApp);
          }
        }
      }];
      
      setContextMenu({ x: e.clientX, y: e.clientY, item: items });
  }, [handleOpenEditModal]);
  
  // --- GESTION IMAGE MODAL ---

  const handleOpenImageModal = useCallback((employee?: User) => {
      setSelectedEmployee(employee!);
      setIsImageSelectorOpen(true);
  }, []);

  const handleCloseImageModal = useCallback(() => {
      setIsImageSelectorOpen(false);
      setUploadError(null);
  }, []);

  const handleImageUpload = async (file: File): Promise<Image> => {
      setIsUploading(true);
      setUploadError(null);
  
      try {
        if (file.size > 200 * 1024) {
          throw new Error('Le fichier est trop volumineux. Taille maximum : 200 Ko');
        }
  
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error('Format non supporté. Formats acceptés : JPG, PNG, GIF, WebP, SVG');
        }
  
        return new Promise((resolve, reject) => {
          const img = new Image();
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
  
          img.onload = () => {
            const { width, height } = img;
            
            if (width > 480 || height > 480) {
              setUploadError('Image trop grande. Dimensions maximum : 480x480px');
              setIsUploading(false);
              reject(new Error('Image trop grande'));
              return;
            }
  
            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0);
            
            const dataURL = canvas.toDataURL('image/png');

            const newImageId = Date.now();
            const result = addImage({ id: newImageId, image: dataURL, name: file.name });
        
            setIsUploading(false);
            resolve(result);
          };
  
          img.onerror = () => {
            setIsUploading(false);
            reject(new Error('Impossible de charger l\'image'));
          };
  
          const reader = new FileReader();
          reader.onload = (e) => {
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
      } catch (error) {
        setIsUploading(false);
        setUploadError(error instanceof Error ? error.message : 'Erreur inconnue');
        throw error;
      }
  };

  return {
      // Context Menu
      contextMenu,
      closeContextMenu,
      handleContextMenu,
      handleDataTableContextMenu,
      
      // Clavier
      handleGlobalKeyboard,
      
      // Image Selector
      isImageSelectorOpen,
      isUploading,
      uploadError,
      handleOpenImageModal,
      handleCloseImageModal,
      handleImageUpload
  };
};