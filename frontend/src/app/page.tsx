import HeroSearch from "@/components/home/HeroSearch";
import CategoryGrid from "@/components/home/CategoryGrid";

export default function Home() {
  return (
    <>
      <HeroSearch />
      <CategoryGrid />
      
      {/* Additional CTA Section (Optional/Premium touch) */}
      <section className="w-full border-t border-color-border-light bg-color-background px-6 py-24 lg:px-8 text-center flex flex-col items-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-color-foreground sm:text-4xl">
            Are you a legal professional?
          </h2>
          <p className="mt-6 text-lg leading-8 text-color-text-muted">
            Join thousands of attorneys who use LawyerComparison to connect with clients, grow their practice, and build their reputation.
          </p>
          <div className="mt-10 flex items-center justify-center">
            <a
              href="/lawyer-help"
              className="bg-color-foreground text-color-background px-8 py-3 text-sm font-semibold hover:opacity-80 transition-minimal"
            >
              List Your Practice
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
