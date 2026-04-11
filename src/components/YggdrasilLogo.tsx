import { cn } from "@/lib/utils";

interface YggdrasilLogoProps {
  className?: string;
  size?: number;
}

export const YggdrasilLogo = ({ className, size = 40 }: YggdrasilLogoProps) => (
  <svg
    viewBox="0 0 100 100"
    width={size}
    height={size}
    className={cn("flex-shrink-0", className)}
    aria-label="Yggdrasil logo"
  >
    {/* Outer ring */}
    <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.4" />
    
    {/* Trunk */}
    <path
      d="M50 85 L50 40"
      stroke="hsl(var(--foreground))"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
    
    {/* Main branches */}
    <path
      d="M50 55 Q35 45, 22 30"
      stroke="hsl(var(--foreground))"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M50 55 Q65 45, 78 30"
      stroke="hsl(var(--foreground))"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M50 45 Q40 38, 30 22"
      stroke="hsl(var(--foreground))"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M50 45 Q60 38, 70 22"
      stroke="hsl(var(--foreground))"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
    
    {/* Roots */}
    <path
      d="M50 85 Q40 90, 28 92"
      stroke="hsl(var(--foreground))"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M50 85 Q60 90, 72 92"
      stroke="hsl(var(--foreground))"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M50 85 Q45 92, 38 96"
      stroke="hsl(var(--foreground))"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M50 85 Q55 92, 62 96"
      stroke="hsl(var(--foreground))"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
    
    {/* Branch nodes (amber) */}
    <circle cx="22" cy="30" r="4" fill="hsl(var(--primary))" />
    <circle cx="78" cy="30" r="4" fill="hsl(var(--primary))" />
    <circle cx="30" cy="22" r="3" fill="hsl(var(--primary))" />
    <circle cx="70" cy="22" r="3" fill="hsl(var(--primary))" />
    <circle cx="50" cy="40" r="3.5" fill="hsl(var(--primary))" />
    
    {/* Root nodes */}
    <circle cx="28" cy="92" r="3" fill="hsl(var(--accent))" />
    <circle cx="72" cy="92" r="3" fill="hsl(var(--accent))" />
    <circle cx="38" cy="96" r="2.5" fill="hsl(var(--accent))" />
    <circle cx="62" cy="96" r="2.5" fill="hsl(var(--accent))" />
    
    {/* Center crown node */}
    <circle cx="50" cy="18" r="5" fill="hsl(var(--primary))" opacity="0.8" />
    <circle cx="50" cy="18" r="8" fill="hsl(var(--primary))" opacity="0.15" />
  </svg>
);
