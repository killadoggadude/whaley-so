import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center space-y-8 max-w-2xl px-4">
        <img src="/thirst-so-logo.png" alt="thirst.so" className="h-24 w-auto mx-auto" />
        <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
          AI-powered content creation and management tool
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button size="lg" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/signup">Create Account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}