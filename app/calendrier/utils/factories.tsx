// import { useEffect, useState } from "react";
// import { Appointment, User, ChantierItem, Item, Equipe } from "../types";
// import { AppointmentItem } from '@/app/calendrier/components'; // Assurez-vous que le chemin est bon


// // --- FACTORY DES RENDERERS (AFFICHAGE DES CELLULES DES TABLEAUX ) ---

// export const customRenderersFactory = (
//   viewType: string, 
//   employees: User[], 
//   onImageClick: (employee: User) => void,
//   setSelectedAppointment: (appointment: Appointment) => void,
//   handleOpenEditModal: (appointment: Appointment) => void,
//   initialTeams: Record<number, Equipe>,
//   onTeamChange: (Employee: User, groupId: number | null) => Promise<{ success: boolean }>
// ) => {

  


//   // --- RETOUR SELON LE VIEW TYPE ---

//   if (viewType === 'chantier-table') {

//     return {
//       image: imageRendererChantierAndPaie,
//       etat: (value: string) => {
//         const statusColors: Record<string, string> = {
//           'En cours': 'bg-green-100 text-green-800',
//           'Planifié': 'bg-blue-100 text-blue-800',
//           'Suspendu': 'bg-yellow-100 text-yellow-800',
//           'Terminé': 'bg-gray-100 text-gray-800',
//           'Annulé': 'bg-red-100 text-red-800'
//         };
//         const colorClass = statusColors[value] || 'bg-gray-100 text-gray-800';
//         return (
//           <div className="flex items-center justify-center w-full h-full">
//             <span className={`inline-flex w-[80px] h-[25px] justify-center items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
//               {value}
//             </span>
//           </div>
//         );
//       },
//       AP: (value: any, item: any) => analyseChantierRender(value, item, 'AP'),
//       SP: (value: any, item: any) => analyseChantierRender(value, item, 'SP'),
//       TM: (value: any, item: any) => analyseChantierRender(value, item, 'TM'),
//       HR: (value: any, item: any) => analyseChantierRender(value, item, 'HR'),
//       SH: (value: any, item: any) => analyseChantierRender(value, item, 'SH'),
//       DPF: (value: any, item: any) => analyseChantierRender(value, item, 'DPF'),
//       RPF: (value: any, item: any) => analyseChantierRender(value, item, 'RPF'),

//     };
//   }

//   if (viewType === 'paie-table') {
//     return {
//       Image: imageRendererChantierAndPaie,
//       Verrou: (value: boolean) => (          
//         <div className="flex items-center justify-center">
//           {value ? (
//             <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
//               <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
//             </svg>
//           ) : (
//             <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
//               <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"/>
//             </svg>
//           )}
//         </div>
//       ),
//       Actif: (value: boolean) => (
//         <div className="flex items-center justify-center">
//           <span className={`w-3 h-3 rounded-full ${value ? 'bg-green-600' : 'bg-red-600'}`}></span>
//         </div>
//       )
//     };
//   }

//   // Default: Employee Table
//   return {
//     Image: imageRendererEmployee,
//     Equipe: (value: any, item: User) => (  
//       <TeamSelectCell
//         item={item}
//         initialTeams={initialTeams}
//         onTeamChange={onTeamChange}
//       />
//     ),
//     Type: (value: string) => {
//       const typeColors: Record<string, string> = {
//         'INTERIM': 'bg-interim text-white',
//         'SALARIE': 'bg-employee text-white',
//       };
//       const colorClass = typeColors[value] || 'bg-gray-100 text-gray-800';
//       // Capitalize first letter
//       const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
      
//       return (
//         <div className="flex items-center justify-center w-full h-full">
//           <span className={`inline-flex w-[80px] h-[25px] justify-center items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
//             {label}
//           </span>
//         </div>
//       );
//     }
//   };
// };





