import Link from "next/link";
import { Twitter, Instagram, Youtube } from "lucide-react";

interface FooterProps {
  variant?: "public" | "dashboard";
}

export function Footer({ variant = "public" }: FooterProps) {
  const isPublic = variant === "public";

  return (
    <footer className="border-t border-border py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="/thirst-so-logo.png" 
              alt="thirst.so" 
              className={isPublic ? "h-8 w-auto" : "h-6 w-auto"} 
            />
            {isPublic && (
              <span className="text-sm text-muted-foreground">
                AI-powered content creation for creators.
              </span>
            )}
          </div>
          
          {isPublic && (
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="/how-it-works" className="hover:text-foreground transition-colors">
                How it Works
              </Link>
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="/faq" className="hover:text-foreground transition-colors">
                FAQ
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            {isPublic && (
              <div className="flex gap-3">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Twitter className="h-5 w-5" />
                  <span className="sr-only">Twitter</span>
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Instagram className="h-5 w-5" />
                  <span className="sr-only">Instagram</span>
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Youtube className="h-5 w-5" />
                  <span className="sr-only">YouTube</span>
                </a>
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} thirst.so. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
