import Link from "next/link";
import { CheckCircle2, TrendingUp, ShieldCheck, Users } from "lucide-react";

export default function LawyerHelpPage() {
  return (
    <div className="w-full bg-color-background">
      
      {/* Hero */}
      <section className="border-b border-color-border-light bg-gray-50/50 px-6 py-24 lg:px-8 text-center flex flex-col items-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-color-foreground sm:text-6xl">
            Grow Your Practice with LawyerComparison
          </h1>
          <p className="mt-6 text-xl leading-8 text-color-text-muted">
            Join the most exclusive, high-converting legal directory in the United States. Connect with premium clients actively seeking your exact expertise.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link 
              href="#pricing" 
              className="bg-color-foreground text-color-background px-8 py-4 text-sm font-bold shadow-md hover:opacity-90 transition-minimal"
            >
              View Membership Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 h-16 w-16 bg-color-foreground text-color-background flex items-center justify-center">
            <TrendingUp className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-color-foreground">High-Intent Leads</h3>
          <p className="mt-2 text-color-text-muted">
            Our strict B&W premium design attracts serious, high-net-worth clients looking for elite representation, not free advice.
          </p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 h-16 w-16 bg-color-foreground text-color-background flex items-center justify-center">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-color-foreground">Verified Authority</h3>
          <p className="mt-2 text-color-text-muted">
            Stand out with dynamic trust badges, verified review integrations, and an SEO-optimized profile that ranks instantly.
          </p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 h-16 w-16 bg-color-foreground text-color-background flex items-center justify-center">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-color-foreground">Seamless Booking</h3>
          <p className="mt-2 text-color-text-muted">
            Integrated scheduling systems convert profile views into booked consultations without administrative overhead.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-color-border-light bg-gray-50/50 px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-color-foreground sm:text-4xl">
            Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-color-text-muted">No hidden lead fees. Just flat, predictable growth.</p>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            
            {/* Basic */}
            <div className="flex flex-col border border-color-border-light bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold text-color-foreground">Basic Listing</h3>
              <p className="mt-2 text-sm text-color-text-muted">Essential visibility.</p>
              <div className="mt-6 text-4xl font-bold text-color-foreground">$99<span className="text-sm font-medium text-color-text-muted">/mo</span></div>
              <ul className="mt-8 mb-8 space-y-4 flex-1">
                <li className="flex items-center gap-3 text-sm text-color-foreground"><CheckCircle2 className="h-5 w-5 text-color-text-muted" /> Standard Profile</li>
                <li className="flex items-center gap-3 text-sm text-color-foreground"><CheckCircle2 className="h-5 w-5 text-color-text-muted" /> Receive Direct Messages</li>
                <li className="flex items-center gap-3 text-sm text-color-text-muted opacity-50"><CheckCircle2 className="h-5 w-5" /> No Booking Widget</li>
              </ul>
              <Link 
                href="/lawyer-onboarding/pricing" 
                className="mt-auto w-full text-center block border border-color-border-light bg-transparent py-3 text-sm font-bold text-color-foreground hover:border-color-foreground transition-minimal"
              >
                Select Basic
              </Link>
            </div>

            {/* Premium */}
            <div className="flex flex-col border-2 border-black bg-white p-8 shadow-xl relative scale-100 md:scale-105 z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-xs font-bold uppercase tracking-widest text-black">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-black">Premium Partner</h3>
              <p className="mt-2 text-sm text-neutral-500">Maximum conversion.</p>
              <div className="mt-6 text-4xl font-bold text-black">$299<span className="text-sm font-medium text-neutral-500">/mo</span></div>
              <ul className="mt-8 mb-8 space-y-4 flex-1">
                <li className="flex items-center gap-3 text-sm text-black"><CheckCircle2 className="h-5 w-5 text-black" /> Priority Search Ranking</li>
                <li className="flex items-center gap-3 text-sm text-black"><CheckCircle2 className="h-5 w-5 text-black" /> Full Booking Widget</li>
                <li className="flex items-center gap-3 text-sm text-black"><CheckCircle2 className="h-5 w-5 text-black" /> 'Verified' Trust Badge</li>
              </ul>
              <Link 
                href="/lawyer-onboarding/pricing" 
                className="mt-auto w-full text-center block bg-black py-3 text-sm font-bold text-white shadow-md hover:bg-neutral-800 transition-minimal"
              >
                Claim Premium Profile
              </Link>
            </div>

            {/* Elite */}
            <div className="flex flex-col border border-color-border-light bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold text-color-foreground">Elite Enterprise</h3>
              <p className="mt-2 text-sm text-color-text-muted">For entire law firms.</p>
              <div className="mt-6 text-4xl font-bold text-color-foreground">$899<span className="text-sm font-medium text-color-text-muted">/mo</span></div>
              <ul className="mt-8 mb-8 space-y-4 flex-1">
                <li className="flex items-center gap-3 text-sm text-color-foreground"><CheckCircle2 className="h-5 w-5 text-color-text-muted" /> Up to 10 Attorney Profiles</li>
                <li className="flex items-center gap-3 text-sm text-color-foreground"><CheckCircle2 className="h-5 w-5 text-color-text-muted" /> Dedicated Account Manager</li>
                <li className="flex items-center gap-3 text-sm text-color-foreground"><CheckCircle2 className="h-5 w-5 text-color-text-muted" /> API Integrations</li>
              </ul>
              <Link 
                href="/contact" 
                className="mt-auto w-full text-center block border border-color-border-light bg-transparent py-3 text-sm font-bold text-color-foreground hover:border-color-foreground transition-minimal"
              >
                Contact Sales
              </Link>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
