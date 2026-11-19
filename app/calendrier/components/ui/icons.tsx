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