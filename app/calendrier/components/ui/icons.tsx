interface GroupIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export const GroupIcon: React.FC<GroupIconProps> = ({
  size = 24,
  color = "currentColor",
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-user-group preview-icon"
      {...props}
    >
      <path d="M17 21v-1a2 2 0 00-2-2H9a2 2 0 00-2 2v1" />
      <path d="M19 10h1a2 2 0 012 2v1" />
      <path d="M5 10H4a2 2 0 00-2 2v1" />
      <circle cx="12" cy="11" r="3" />
      <circle cx="18" cy="4" r="2" />
      <circle cx="6" cy="4" r="2" />
    </svg>
  );
};


export const TrashIcon: React.FC<GroupIconProps> = ({
  size = 24,
  color = "currentColor",
  ...props
}) => {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}