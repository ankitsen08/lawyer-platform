import Link from "next/link";
import { 
  Briefcase, Car, Users, Scale, Home, FileText, 
  ShieldAlert, Building2, Gavel, HeartHandshake, 
  Banknote, Plane, Landmark, GraduationCap, 
  Stethoscope, FileSignature
} from "lucide-react";

const ALL_CATEGORIES = [
  { name: "Personal Injury", icon: Car, slug: "personal-injury" },
  { name: "Family Law", icon: Users, slug: "family-law" },
  { name: "Criminal Defense", icon: ShieldAlert, slug: "criminal-defense" },
  { name: "Business Law", icon: Briefcase, slug: "business-law" },
  { name: "Real Estate", icon: Home, slug: "real-estate" },
  { name: "Estate Planning", icon: FileText, slug: "estate-planning" },
  { name: "Employment Law", icon: Building2, slug: "employment-law" },
  { name: "Civil Rights", icon: Scale, slug: "civil-rights" },
  { name: "Immigration", icon: Plane, slug: "immigration" },
  { name: "Bankruptcy", icon: Banknote, slug: "bankruptcy" },
  { name: "Medical Malpractice", icon: Stethoscope, slug: "medical-malpractice" },
  { name: "Tax Law", icon: Landmark, slug: "tax-law" },
  { name: "Intellectual Property", icon: FileSignature, slug: "intellectual-property" },
  { name: "Education Law", icon: GraduationCap, slug: "education-law" },
  { name: "Environmental Law", icon: HeartHandshake, slug: "environmental-law" },
  { name: "Litigation", icon: Gavel, slug: "litigation" },
];

export default function CategoriesPage() {
  return (
    <div className="w-full bg-color-background px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 border-b border-color-border-light pb-6 text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight text-color-foreground sm:text-5xl">
            Browse by Practice Area
          </h1>
          <p className="mt-4 text-lg text-color-text-muted">
            Select a legal category below to find specialized attorneys ready to handle your case.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="group relative flex flex-col items-start justify-between border border-color-border-light bg-color-background p-8 transition-minimal hover:border-color-foreground hover:shadow-md"
              >
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center bg-gray-50 text-color-foreground transition-minimal group-hover:bg-color-foreground group-hover:text-color-background">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-color-foreground group-hover:underline decoration-2 underline-offset-4">
                    {category.name}
                  </h3>
                  <p className="mt-3 text-sm font-semibold text-color-text-muted transition-minimal group-hover:text-color-foreground">
                    Find specialized lawyers &rarr;
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
