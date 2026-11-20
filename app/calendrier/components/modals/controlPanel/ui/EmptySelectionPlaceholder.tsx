export const EmptySelectionPlaceholder: React.FC<{
  icon: React.ReactNode;
  title: string;
  actionLabel: string;
  targetDescription: string;
}> = ({ icon, title, actionLabel, targetDescription }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-primary-bg/40 rounded-2xl border border-dashed border-light min-h-[300px]">
    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
      {icon}
    </div>
    <p className="text-sm font-semibold text-primary poppins">{title}</p>
    <p className="text-xs text-secondary/80 mt-1 max-w-xs poppins leading-relaxed">
      Veuillez cliquer sur <span className="font-semibold text-primary">« {actionLabel} »</span> sur {targetDescription} à
      gauche.
    </p>
  </div>
);