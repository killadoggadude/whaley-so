import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Pricing | AI OFM",
  description: "Choose the perfect plan for your content creation needs",
};

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 15,
    description: "Perfect for getting started",
    features: [
      "80 reels/month",
      "1 AI Model",
      "Standard quality",
      "Basic support",
      "480p video export",
      "Community support",
    ],
    notIncluded: [
      "Priority processing",
      "Advanced features",
    ],
    color: "from-blue-500 to-blue-600",
    priceId: "price_starter",
  },
  {
    id: "pro",
    name: "Pro",
    price: 39,
    description: "Best for serious creators",
    features: [
      "Unlimited reels",
      "3 AI Models",
      "Priority processing",
      "Priority support",
      "720p video export",
      "Advanced features",
      "API access",
    ],
    notIncluded: [
      "White-label options",
    ],
    color: "from-purple-500 to-purple-600",
    popular: true,
    priceId: "price_pro",
  },
  {
    id: "agency",
    name: "Agency",
    price: 99,
    description: "For teams and agencies",
    features: [
      "Unlimited everything",
      "Unlimited AI Models",
      "Highest priority",
      "Dedicated support",
      "1080p video export",
      "API access",
      "White-label options",
      "Custom integrations",
    ],
    notIncluded: [],
    color: "from-yellow-500 to-orange-500",
    priceId: "price_agency",
  },
];

const faqs = [
  {
    q: "What's included in the free trial?",
    a: "All plans come with a 7-day free trial. You get full access to all features, so you can explore everything AI OFM has to offer before committing.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, the change takes effect at the end of your billing cycle.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards (Visa, Mastercard, American Express) through Stripe. More payment options coming soon.",
  },
  {
    q: "Is there a refund policy?",
    a: "Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact us within 30 days of your first payment for a full refund.",
  },
  {
    q: "What counts as a reel?",
    a: "Each video you generate counts as one reel, regardless of length. Bulk generations count individually.",
  },
  {
    q: "Can I use my own API keys?",
    a: "Yes! Pro and Agency plans can use their own API keys for ElevenLabs, Kling, and other services. This can help reduce costs for high-volume users.",
  },
];

export default function PricingPage() {
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
            Simple,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
              Transparent
            </span>{" "}
            Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when ready. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col",
                  plan.popular && "border-primary shadow-lg shadow-primary/10"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 opacity-50">
                        <span className="h-5 w-5 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className={cn(
                      "w-full",
                      plan.popular && "bg-gradient-to-r",
                      plan.color
                    )}
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href={`/signup?plan=${plan.id}`}>
                      Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="p-6 rounded-xl border bg-card">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Can't find the answer you're looking for? We're here to help.
          </p>
          <Button size="lg" asChild>
            <Link href="/contact">Contact Us</Link>
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
            <Link href="/faq" className="hover:text-foreground">FAQ</Link>
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
