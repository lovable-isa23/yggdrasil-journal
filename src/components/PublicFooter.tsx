import { Link } from "react-router-dom";
import { YggdrasilLogo } from "@/components/YggdrasilLogo";

const FOOTER_LINKS = [
  { label: "Home", path: "/" },
  { label: "Topics", path: "/topics" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
  { label: "Sign In", path: "/login" },
];

export const PublicFooter = () => {
  return (
    <footer className="relative bg-card border-t border-border">
      {/* Root-line SVG decoration */}
      <div className="absolute top-0 left-0 right-0 -translate-y-px overflow-hidden">
        <svg
          viewBox="0 0 1200 30"
          className="w-full h-6"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0 15 Q150 5, 300 15 Q450 25, 600 15 Q750 5, 900 15 Q1050 25, 1200 15"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="1.5"
          />
          {/* Small root nodes */}
          <circle cx="150" cy="10" r="2.5" fill="hsl(var(--primary))" opacity="0.5" />
          <circle cx="450" cy="20" r="2" fill="hsl(var(--accent))" opacity="0.5" />
          <circle cx="750" cy="10" r="2.5" fill="hsl(var(--primary))" opacity="0.5" />
          <circle cx="1050" cy="20" r="2" fill="hsl(var(--accent))" opacity="0.5" />
        </svg>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <YggdrasilLogo size={28} />
            <span className="font-serif font-semibold text-foreground">
              Yggdrasil
            </span>
          </div>

          <nav className="flex flex-wrap gap-6 justify-center">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Yggdrasil. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
