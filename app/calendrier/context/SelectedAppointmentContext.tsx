// SelectedAppointmentContext.tsx
import { createContext, useContext } from "react";
import { Appointment } from "../types";
export const SelectedAppointmentContext = createContext<{
  selectedAppointment: Appointment | null;
  setSelectedAppointment: (appointment: Appointment | null) => void;
}>({ selectedAppointment: null, setSelectedAppointment: () => {} });

export const useSelectedAppointment = () => useContext(SelectedAppointmentContext);