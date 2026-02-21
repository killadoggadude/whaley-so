import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import {
  Video,
  Music,
  Clapperboard,
  Flame,
  FileText,
  ImageIcon,
  Sparkles,
  Zap,
  Clock,
  ArrowRight,
  Play,
  Check,
  Star,
} from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Talking Head",
    description: "Turn any photo into a realistic talking head video. Just add a script.",
  },
  {
    icon: Music,
    title: "Dancing Reel",
    description: "Make your model dance to any beat. Perfect for trending sounds.",
  },
  {
    icon: Clapperboard,
    title: "Motion Control",
    description: "Recreate any pose or movement from a reference video.",
  },
  {
    icon: Flame,
    title: "Viral Reels",
    description: "Auto-captioned and algorithm-optimized for maximum reach.",
  },
  {
    icon: FileText,
    title: "AI Scripts",
    description: "Generate scroll-stopping scripts with our AI humanizer.",
  },
  {
    icon: ImageIcon,
    title: "Prompt Library",
    description: "Proven prompts for generating perfect images every time.",
  },
];

const stats = [
  { value: "50,000+", label: "Videos Created" },
  { value: "10,000+", label: "Happy Creators" },
  { value: "50+", label: "Countries Worldwide" },
];

const testimonials = [
  {
    quote: "I used to spend 4 hours editing one reel. Now I crank out 10 in the time it takes to make coffee. This is insane.",
    author: "@creativestudio",
    handle: "Creative Studio",
  },
  {
    quote: "My engagement literally tripled in a week. The auto-captions alone are worth it. Game changer.",
    author: "@trendsetter",
    handle: "Trend Setter",
  },
  {
    quote: "Finally, an AI tool that actually understands what creators need. No more janky workflows.",
    author: "@contentqueen",
    handle: "Content Queen",
  },
];

const steps = [
  {
    number: "01",
    title: "Upload",
    description: "Drop your model's image or pick from your library",
  },
  {
    number: "02",
    title: "Script",
    description: "Write a script or let AI generate one for you",
  },
  {
    number: "03",
    title: "Generate",
    description: "Hit create and get your reel in minutes",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/thirst-so-logo.png" alt="thirst.so" className="h-10 w-auto" />
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/gallery">Gallery</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Sparkles className="h-4 w-4" />
            AI-Powered Content Creation
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
            Go Viral in Seconds,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              Not Hours
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            AI-powered talking head videos, dancing reels & motion control. 
            Pick your image, write a script, boom — ready to post.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-lg px-8 h-14" asChild>
              <Link href="/signup">
                Start Creating Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 h-14" asChild>
              <Link href="#demo">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
            <Clock className="h-5 w-5" />
            <span className="text-sm font-medium">THE OLD WAY</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">
            Spend 4 hours editing one reel? Yeah, no thanks.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Recording, editing, captions, formatting... it's exhausting. 
            You should be creating, not stuck in CapCut for 6 hours.
          </p>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            One Click. One Reel.{" "}
            <span className="text-primary">Done.</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Upload an image, paste a script, and watch AI create a professional 
            talking head video in minutes. No filming. No editing. Just results.
          </p>
          
          <div className="relative aspect-video bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 rounded-2xl border border-border/50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 rounded-2xl" />
            <Button size="lg" variant="secondary" className="relative z-10" asChild>
              <Link href="#demo">
                <Play className="mr-2 h-5 w-5" />
                Watch It In Action
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-muted/30" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to Go Viral
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Six powerful tools, one simple workflow. Create content that stops the scroll.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4" id="how-it-works">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Three Steps to Viral
            </h2>
            <p className="text-xl text-muted-foreground">
              No complicated setup. No learning curve. Just create.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative text-center">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] right-0 h-[2px] bg-gradient-to-r from-primary/50 to-transparent" />
                )}
                <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-bold text-primary">{step.number}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4" id="testimonials">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Creators Love Thirst.so
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of creators who've already leveled up their content game.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.author}
                className="p-6 rounded-2xl border border-border bg-card"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-foreground mb-4 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-semibold">
                    {testimonial.handle[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{testimonial.handle}</div>
                    <div className="text-muted-foreground text-sm">{testimonial.author}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Go Viral?
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join thousands of creators who save hours every week with AI-powered content creation.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button size="lg" className="text-lg px-10 h-14" asChild>
              <Link href="/signup">
                Start Creating Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Free tier available
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      <Footer variant="public" />
    </div>
  );
}
