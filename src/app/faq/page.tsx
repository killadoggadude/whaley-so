import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "FAQ | AI OFM",
  description: "Frequently Asked Questions about AI OFM",
};

const categories = [
  {
    name: "Getting Started",
    faqs: [
      {
        q: "What is AI OFM?",
        a: "AI OFM (One Face Many) is an AI-powered content creation tool that lets you create talking head videos, dancing reels, and motion-controlled videos from static images. Simply upload a photo, write a script, and our AI generates professional-quality videos in minutes.",
      },
      {
        q: "How does the free trial work?",
        a: "All plans come with a 7-day free trial. No credit card required to start. You'll have full access to all features during the trial period so you can explore everything AI OFM has to offer.",
      },
      {
        q: "Is it really free to get started?",
        a: "Yes! You can sign up and start creating videos immediately with our free trial. After 7 days, you can choose a plan that fits your needs.",
      },
    ],
  },
  {
    name: "Billing & Pricing",
    faqs: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards through Stripe: Visa, Mastercard, American Express, and Discover. More payment options coming soon.",
      },
      {
        q: "Can I cancel my subscription?",
        a: "Yes, you can cancel your subscription at any time from your billing settings. Your access will continue until the end of your current billing period.",
      },
      {
        q: "Do you offer refunds?",
        a: "We offer a 30-day money-back guarantee. If you're not satisfied with AI OFM, contact our support team within 30 days of your first payment for a full refund.",
      },
      {
        q: "What happens when my trial ends?",
        a: "When your trial ends, you'll need to choose a plan to continue using AI OFM. Your data and creations will be saved, but you'll need an active subscription to generate new videos.",
      },
    ],
  },
  {
    name: "Video Generation",
    faqs: [
      {
        q: "How long does video generation take?",
        a: "Video generation typically takes 3-8 minutes depending on the complexity and length of the video. Priority users (Pro and Agency plans) get faster processing times.",
      },
      {
        q: "What quality options are available?",
        a: "Starter plan offers 480p, Pro offers up to 720p, and Agency offers up to 1080p video exports. Higher quality settings may take longer to generate.",
      },
      {
        q: "Can I use my own images?",
        a: "Absolutely! You can upload your own photos to create custom AI models. Just make sure you have the rights to use the images.",
      },
      {
        q: "Do I need API keys?",
        a: "API keys are optional. By default, we handle all API costs through your subscription. Pro and Agency plans can optionally use their own API keys for greater control and potential cost savings on high volumes.",
      },
    ],
  },
  {
    name: "Account & Security",
    faqs: [
      {
        q: "Is my data secure?",
        a: "Yes, we take data security seriously. All your data is encrypted at rest and in transit. We never share your content or data with third parties.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes, you can delete your account at any time from your profile settings. This will permanently remove all your data and creations.",
      },
      {
        q: "What happens to my videos if I cancel?",
        a: "Your videos remain accessible as long as your account is active. If you cancel, you can still view and download your existing videos, but you won't be able to create new ones.",
      },
    ],
  },
];

export default function FAQPage() {
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
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Frequently Asked{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              Questions
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about AI OFM
          </p>
        </div>
      </section>

      {/* FAQs by Category */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {categories.map((category) => (
            <div key={category.name} className="mb-16 last:mb-0">
              <h2 className="text-2xl font-bold mb-6">{category.name}</h2>
              <div className="space-y-4">
                {category.faqs.map((faq, idx) => (
                  <details
                    key={idx}
                    className="group rounded-xl border bg-card overflow-hidden"
                  >
                    <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer list-none">
                      <span className="font-medium text-lg">{faq.q}</span>
                      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-6 pb-6 text-muted-foreground">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Can't find what you're looking for? Our team is here to help.
          </p>
          <Button size="lg" asChild>
            <Link href="/contact">
              Contact Support <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/thirst-so-logo.png" alt="thirst.so" className="h-8 w-auto" />
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/how-it-works" className="hover:text-foreground">How it Works</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/contact" className="hover:text-foreground">Contact</Link>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2026 AI OFM. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
