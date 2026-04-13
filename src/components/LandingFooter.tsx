import { Link } from "react-router-dom";
import yggdrasilLogo from "@/assets/yggdrasil-logo.png";

export const LandingFooter = () => {
  return (
    <footer className="border-t border-border bg-card py-12 px-6">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div className="flex items-center gap-3">
            <img src={yggdrasilLogo} alt="Yggdrasil" className="h-8 w-8 object-contain" />
            <div>
              <span className="font-semibold text-foreground">Yggdrasil</span>
              <p className="text-xs text-muted-foreground">Transform your journaling experience</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © 2026 Yggdrasil. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
