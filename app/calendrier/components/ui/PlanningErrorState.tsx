interface PlanningErrorStateProps {
  code?: string | number;
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function PlanningErrorState({
  code = "500",
  title = "Oups ! Un problème est survenu",
  message,
  onRetry,
}: PlanningErrorStateProps) {
  return (
    <div className="flex items-center justify-center h-full w-full p-6 poppins">
      <div className="relative max-w-md w-full bg-secondary border border-light rounded-3xl shadow-xl p-8 text-center overflow-hidden">
        {/* Halo décoratif discret en arrière-plan */}
        <div
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-15 blur-3xl"
          style={{ background: "var(--color-primary, #009580)" }}
        />

        {/* Code d'erreur en grand */}
        <div className="relative select-none mb-2">
          <span
            className="block text-7xl sm:text-8xl font-extrabold tracking-tight leading-none bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--color-primary, #009580) 0%, #23adde 100%)",
            }}
          >
            {code}
          </span>
        </div>

        {/* Badge d'alerte */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold mb-4">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>Erreur de chargement</span>
        </div>

        {/* Titre et message */}
        <h3 className="text-lg font-bold text-primary mb-2">{title}</h3>
        <p className="text-sm text-secondary leading-relaxed mb-6">
          {message}
        </p>

        {/* Bouton d'action */}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white text-xs font-semibold shadow-md hover:shadow-lg hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
}