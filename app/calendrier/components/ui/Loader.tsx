import React, { useId } from "react";

type LoaderProps = React.ComponentProps<"svg"> & {
  variant?: 'spinner' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
};

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const Loader = React.forwardRef<SVGSVGElement, LoaderProps>(
  ({ variant = 'spinner', size = 'md', message, className, ...props }, ref) => {
    const baseId = useId().replace(/:/g, "");
    const leadingGradientId = `${baseId}-leading`;
    const trailingGradientId = `${baseId}-trailing`;

    return (
      <div 
        className="flex flex-col items-center justify-center gap-3" 
        role="status" 
        aria-label={message || 'Chargement en cours'}
      >
        {variant === 'spinner' ? (
          <svg
            ref={ref}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
           
            className={"animate-spin text-primary-600 " + sizeClasses[size] + " " + className}
            {...props}
          >
            <defs>
              <linearGradient id={leadingGradientId} x1="50%" x2="50%" y1="5.271%" y2="91.793%">
                <stop offset="0%" stopColor="currentColor" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id={trailingGradientId} x1="50%" x2="50%" y1="15.24%" y2="87.15%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
              </linearGradient>
            </defs>
            <g fill="none">
              <path
                d="M8.749.021a1.5 1.5 0 0 1 .497 2.958A7.5 7.5 0 0 0 3 10.375a7.5 7.5 0 0 0 7.5 7.5v3c-5.799 0-10.5-4.7-10.5-10.5C0 5.23 3.726.865 8.749.021"
                fill={`url(#${leadingGradientId})`}
                transform="translate(1.5 1.625)"
              />
              <path
                d="M15.392 2.673a1.5 1.5 0 0 1 2.119-.115A10.48 10.48 0 0 1 21 10.375c0 5.8-4.701 10.5-10.5 10.5v-3a7.5 7.5 0 0 0 5.007-13.084a1.5 1.5 0 0 1-.115-2.118"
                fill={`url(#${trailingGradientId})`}
                transform="translate(1.5 1.625)"
              />
            </g>
          </svg>
        ) : (
          <div className={"flex items-center gap-1.5 " + sizeClasses[size] + " " + className} aria-hidden="true">
            <div className="w-1.5 h-2/3 bg-primary rounded-full animate-pulse" />
            <div className="w-1.5 h-full bg-primary rounded-full animate-pulse" style={{ animationDelay: '250ms' }} />
            <div className="w-1.5 h-2/3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '500ms' }} />
          </div>
        )}

        {message && (
          <p className="text-sm font-medium text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    );
  }
);

Loader.displayName = "Loader";

export default Loader;