export const MasterDetailSplitLayout: React.FC<{
  leftTitle: string;
  leftContent: React.ReactNode;
  rightContent?: React.ReactNode;
}> = ({ leftTitle, leftContent, rightContent }) => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
    {/* PANNEAU GAUCHE */}
    <div className="lg:col-span-7 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
      <h4 className="text-sm font-semibold text-primary pb-2 border-b border-ultra-light">
        {leftTitle}
      </h4>
      {leftContent}
    </div>

    {/* PANNEAU DROIT */}
    <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-ultra-light pt-6 lg:pt-0 lg:pl-6 flex flex-col min-h-0 overflow-y-auto">
      {rightContent ?? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-primary/40 rounded-xl border border-dashed border-light min-h-[250px]">
          <p className="text-sm font-medium text-secondary poppins">Aucune donnée de configuration</p>
        </div>
      )}
    </div>
  </div>
);