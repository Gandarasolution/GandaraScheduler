// SelectedCellContext.tsx
import { createContext, useContext } from "react";
export const SelectedCellContext = createContext<{
  selectedCell: { employeeId: number; date: Date } | null;
  setSelectedCell: (cell: { employeeId: number; date: Date } | null) => void;
}>({ selectedCell: null, setSelectedCell: () => {} });

export const useSelectedCell = () => useContext(SelectedCellContext);