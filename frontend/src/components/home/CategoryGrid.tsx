import Link from "next/link";
import { 
  Briefcase, 
  Car, 
  Users, 
  Scale, 
  Home, 
  FileText, 
  ShieldAlert, 
  Building2 
} from "lucide-react";

const categories = [
  { name: "Personal Injury", icon: Car, href: "/category/personal-injury" },
  { name: "Family Law", icon: Users, href: "/category/family-law" },
  { name: "Criminal Defense", icon: ShieldAlert, href: "/category/criminal-defense" },
  { name: "Business Law", icon: Briefcase, href: "/category/business-law" },
  { name: "Real Estate", icon: Home, href: "/category/real-estate" },
  { name: "Estate Planning", icon: FileText, href: "/category/estate-planning" },
  { name: "Employment Law", icon: Building2, href: "/category/employment-law" },
  { name: "Civil Rights", icon: Scale, href: "/category/civil-rights" },
];

export default function CategoryGrid() {
  return (
    <section className="w-full bg-color-background px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 md:flex md:items-center md:justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-color-foreground">
            Top Legal Categories
          </h2>
          <Link 
            href="/categories" 
            className="hidden md:block text-sm font-semibold text-color-text-muted hover:text-color-foreground transition-minimal"
          >
            View all categories &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.name}
                href={category.href}
                className="group relative flex flex-col items-start justify-between border border-color-border-light bg-color-background p-6 transition-minimal hover:border-color-foreground hover:shadow-sm"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center bg-color-foreground text-color-background transition-minimal group-hover:scale-105">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-color-foreground">
                    {category.name}
                  </h3>
                  <p className="mt-2 text-sm text-color-text-muted transition-minimal group-hover:text-color-foreground">
                    Find lawyers &rarr;
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 md:hidden">
          <Link 
            href="/categories" 
            className="block w-full border border-color-foreground bg-transparent py-3 text-center text-sm font-semibold text-color-foreground hover:bg-color-foreground hover:text-color-background transition-minimal"
          >
            View all categories
          </Link>
        </div>
      </div>
    </section>
  );
}
