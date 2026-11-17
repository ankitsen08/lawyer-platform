import HeroSearch from "@/components/home/HeroSearch";
import CategoryGrid from "@/components/home/CategoryGrid";

export default function Home() {
  return (
    <>
      <HeroSearch />
      <CategoryGrid />
      
      {/* Additional CTA Section (Premium touch) */}
      <section className="w-full border-t border-neutral-200 border-color-border-light bg-neutral-50 bg-color-background px-6 py-20 lg:px-8 text-center flex flex-col items-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 text-color-foreground sm:text-4xl">
            Are you a legal professional?
          </h2>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-neutral-600 text-color-text-muted">
            Join thousands of attorneys who use LawyerComparison to connect with clients, grow their practice, and build their reputation.
          </p>
          <div className="mt-8 flex items-center justify-center">
            <a
              href="/lawyer-help"
              className="bg-black bg-color-foreground text-white text-color-background px-8 py-3.5 text-sm font-semibold hover:bg-neutral-800 transition-minimal rounded-sm shadow-sm"
            >
              List Your Practice
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
