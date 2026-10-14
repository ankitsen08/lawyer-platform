import Link from "next/link";
import LawyerCard from "@/components/lawyer/LawyerCard";
import { Lawyer } from "@/store/useCompareStore";
import { ArrowLeft } from "lucide-react";

export function generateStaticParams() {
  return [
    { slug: "personal-injury" },
    { slug: "family-law" },
    { slug: "criminal-defense" },
    { slug: "business-law" },
    { slug: "real-estate" },
    { slug: "estate-planning" },
    { slug: "employment-law" },
    { slug: "civil-rights" },
    { slug: "immigration" },
    { slug: "bankruptcy" },
    { slug: "medical-malpractice" },
    { slug: "tax-law" },
    { slug: "intellectual-property" },
    { slug: "education-law" },
    { slug: "environmental-law" },
    { slug: "litigation" },
  ];
}

async function getCategoryLawyers(categoryName: string): Promise<Lawyer[]> {
  try {
    const SERVER_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/lawyers?category=${encodeURIComponent(categoryName)}`, {
      next: { revalidate: 60 }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (error) {
    // Graceful fallback
  }

  return [
    {
      id: "lwy-001",
      name: "Robert H. Pearson",
      firm: "Pearson & Hardman LLP",
      rating: 4.9,
      reviewCount: 342,
      description: `Specializing in ${categoryName.toLowerCase()} and high-stakes courtroom representation. Over 20 years of proven experience.`,
      location: "New York, NY",
      imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&auto=format&fit=crop&q=60",
      specialty: categoryName,
      experienceYears: 24,
      consultationAvailability: "Within 24 Hours"
    }
  ];
}

export default async function CategorySlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  
  // Convert slug back to human readable format
  const categoryName = resolvedParams.slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const lawyers = await getCategoryLawyers(categoryName);

  return (
    <div className="w-full bg-color-background px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        
        {/* Page Header */}
        <div className="mb-10 border-b border-color-border-light pb-6">
          <Link 
            href="/categories" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-color-text-muted hover:text-color-foreground mb-6 transition-minimal"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Categories
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-color-foreground sm:text-4xl">
                {categoryName} Lawyers
              </h1>
              <p className="mt-2 text-lg text-color-text-muted">
                Top-rated attorneys specializing in {categoryName.toLowerCase()} across the United States.
              </p>
            </div>
            <Link
              href={`/lawyers?category=${encodeURIComponent(categoryName)}`}
              className="bg-black text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity self-start sm:self-auto"
            >
              Open in Directory
            </Link>
          </div>
        </div>

        {/* Lawyer Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lawyers.map((lawyer) => (
            <LawyerCard key={lawyer.id} lawyer={lawyer} />
          ))}
        </div>

        {/* Empty State / Expand Search */}
        <div className="mt-16 border border-color-border-light bg-gray-50/50 p-8 text-center">
          <h3 className="text-xl font-bold text-color-foreground">Looking for more options?</h3>
          <p className="mt-2 text-color-text-muted">Filter by location, fee structure, and experience in our nationwide directory.</p>
          <Link 
            href={`/lawyers?category=${encodeURIComponent(categoryName)}`}
            className="inline-block mt-6 bg-color-foreground text-color-background px-6 py-3 text-sm font-bold shadow-sm hover:opacity-90 transition-minimal"
          >
            View All {categoryName} Lawyers
          </Link>
        </div>

      </div>
    </div>
  );
}
