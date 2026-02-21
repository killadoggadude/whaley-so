import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import { ArrowRight, Upload, FileText, Sparkles, Play, Share } from "lucide-react";

export const metadata = {
  title: "How it Works | AI OFM",
  description: "Learn how to create viral videos with AI OFM in minutes",
};

const steps = [
  {
    number: "01",
    title: "Upload Your Model",
    description: "Upload a photo of yourself or choose from our model library. Our AI analyzes the image to create a realistic digital avatar.",
    icon: Upload,
  },
  {
    number: "02",
    title: "Write Your Script",
    description: "Write your script or use our AI to generate one. You can choose from various styles: flirty, confessional, teasing, and more.",
    icon: FileText,
  },
  {
    number: "03",
    title: "Add Voice",
    description: "Generate natural-sounding voiceovers with ElevenLabs or upload your own. Add trending sounds for maximum engagement.",
    icon: Sparkles,
  },
  {
    number: "04",
    title: "Generate Video",
    description: "Our AI creates a lip-synced talking head video in minutes. Choose quality settings and add auto-captions.",
    icon: Play,
  },
  {
    number: "05",
    title: "Export & Share",
    description: "Download your video in high quality or publish directly to social media. Optimized for Instagram, TikTok, and YouTube.",
    icon: Share,
  },
];

const features = [
  {
    title: "AI-Powered Scripts",
    description: "Generate scroll-stopping scripts with our AI humanizer that removes AI writing patterns.",
  },
  {
    title: "Auto-Captions",
    description: "Every video comes with beautifully styled captions optimized for maximum watch time.",
  },
  {
    title: "Trending Sounds",
    description: "Access a library of trending audio keep to your content fresh and engaging.",
  },
  {
    title: "Bulk Creation",
    description: "Create multiple videos at once with our bulk generation feature. Scale your content production.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/thirst-so-logo.png" alt="thirst.so" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
            Create Viral Videos in 5 Simple Steps
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            No video editing skills required. Just upload, write, and let AI do the magic.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="flex gap-8 py-12 border-b last:border-0"
            >
              <div className="flex-shrink-0">
                <div className="text-6xl font-bold text-primary/20">{step.number}</div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">{step.title}</h3>
                </div>
                <p className="text-muted-foreground text-lg">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Powerful Features</h2>
          <p className="text-xl text-muted-foreground text-center mb-12">
            Everything you need to go viral
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border bg-card hover:border-primary/30 transition-colors"
              >
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Creating?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join 10,000+ creators making viral content with AI OFM.
          </p>
          <Button size="lg" asChild>
            <Link href="/signup">
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer variant="public" />
    </div>
  );
}
