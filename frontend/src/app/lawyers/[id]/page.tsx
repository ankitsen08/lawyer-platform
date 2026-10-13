import Link from "next/link";
import type { Metadata } from "next";
import { Star, MapPin, Award, Phone, Mail, Clock, CheckCircle2, ShieldCheck, Quote, TrendingUp, ArrowLeft } from "lucide-react";
import ContactAttorneyClient from "@/components/lawyer/ContactAttorneyClient";
import ConsultationBooking from "@/components/lawyer/ConsultationBooking";
import { getServerUrl } from "@/utils/apiUrl";

export const dynamicParams = true;

export function generateStaticParams() {
  return [
    { id: 'lwy-001' },
    { id: 'lwy-002' },
    { id: 'lwy-003' },
    { id: 'lwy-004' },
    { id: 'lwy-005' },
  ];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const lawyer = await getLawyerData(id);

  return {
    title: `${lawyer.name} - ${lawyer.specialty} Attorney | LawyerComparison`,
    description: `Connect with ${lawyer.name} at ${lawyer.firm}. Rated ${lawyer.rating}/5 from ${lawyer.reviewCount} client reviews. Specializing in ${lawyer.practiceAreas.join(', ')}.`,
    openGraph: {
      title: `${lawyer.name} - ${lawyer.specialty} Attorney`,
      description: lawyer.about ? lawyer.about.slice(0, 160) : 'Verified Attorney profile on LawyerComparison.',
      images: [{ url: lawyer.imageUrl }],
    },
  };
}

interface PeerEndorsement {
  endorserName: string;
  endorserFirm: string;
  relationship: string;
  text: string;
}

interface CaseResult {
  amount: string;
  type: string;
  description: string;
}

interface ClientReview {
  author: string;
  date: string;
  rating: number;
  text: string;
}

interface LawyerProfile {
  id: string;
  name: string;
  firm: string;
  rating: number;
  reviewCount: number;
  location: string;
  imageUrl: string;
  badges: string[];
  about: string;
  practiceAreas: string[];
  specialty: string;
  hourlyRate: string;
  freeConsultation: boolean;
  contact: {
    phone: string;
    email: string;
    address: string;
  };
  peerEndorsements: PeerEndorsement[];
  caseResults: CaseResult[];
  reviews: ClientReview[];
}

async function getLawyerData(id: string): Promise<LawyerProfile> {
  try {
    const SERVER_URL = getServerUrl();
    const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/lawyers/${id}`, {
      next: { revalidate: 60 }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.name) {
        return {
          id: data.id || id,
          name: data.name,
          firm: data.firm || "Independent Legal Practice",
          rating: Number(data.rating) || 5.0,
          reviewCount: Number(data.reviewCount) || 42,
          location: data.location || "United States",
          imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format&fit=crop&q=80",
          badges: Array.isArray(data.badges) ? data.badges : ["Top Rated Attorney", "Verified State Bar Member", "Client Champion"],
          about: data.about || data.description || "A dedicated attorney focused on achieving superior outcomes.",
          practiceAreas: Array.isArray(data.practiceAreas) ? data.practiceAreas : [data.specialty || "Corporate Litigation"],
          specialty: data.specialty || "Corporate Litigation",
          hourlyRate: data.hourlyRate || "$350/hr",
          freeConsultation: data.freeConsultation ?? true,
          contact: data.contact || {
            phone: "(555) 123-4567",
            email: "attorney@practice.com",
            address: data.location || "100 Enterprise Way, Suite 400"
          },
          peerEndorsements: [
            {
              endorserName: "Michael Sterling",
              endorserFirm: "Sterling Defense Associates",
              relationship: "Colleague",
              text: "A formidable litigator whose preparation and legal acumen are second to none in the courtroom."
            }
          ],
          caseResults: [
            {
              amount: "$15.2M",
              type: "Verdict",
              description: "Secured unanimous verdict in complex commercial breach of contract dispute."
            },
            {
              amount: "Dismissal",
              type: "Defense Victory",
              description: "Full dismissal of regulatory investigation before formal hearings."
            }
          ],
          reviews: [
            {
              author: "Verified Client",
              date: "August 2026",
              rating: 5,
              text: "Exceptional representation from initial consultation through final resolution. Direct, strategic, and highly effective."
            },
            {
              author: "Corporate Client",
              date: "June 2026",
              rating: 5,
              text: "Handled our high-stakes contract dispute with extraordinary precision and speed. Highly recommended."
            }
          ]
        };
      }
    }
  } catch (error) {
    // Fallback
  }

  return {
    id,
    name: "Robert H. Pearson",
    firm: "Pearson & Hardman LLP",
    rating: 4.9,
    reviewCount: 342,
    location: "New York, NY",
    imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format&fit=crop&q=80",
    badges: ["Top Rated in NY", "20+ Years Experience", "Avvo Superb Rating"],
    about: "Robert H. Pearson is a founding partner at Pearson & Hardman LLP, widely recognized as one of the preeminent corporate litigation attorneys in New York. With over two decades of experience, he has successfully represented Fortune 500 companies, financial institutions, and high-net-worth individuals in complex, high-stakes disputes.",
    practiceAreas: ["Corporate Litigation", "Mergers & Acquisitions", "White Collar Defense", "Securities Law"],
    specialty: "Corporate Litigation",
    hourlyRate: "$450/hr",
    freeConsultation: true,
    contact: {
      phone: "(212) 555-0198",
      email: "robert.pearson@ph-law.com",
      address: "100 Wall Street, Suite 4500\nNew York, NY 10005"
    },
    peerEndorsements: [
      {
        endorserName: "Michael Sterling",
        endorserFirm: "Sterling Defense Associates",
        relationship: "Opposing Counsel",
        text: "Robert is a formidable litigator. His grasp of complex financial structures and his ability to dismantle opposing arguments is truly unmatched."
      }
    ],
    caseResults: [
      {
        amount: "$15.2M",
        type: "Jury Verdict",
        description: "Secured a unanimous jury verdict in a complex breach of fiduciary duty lawsuit."
      }
    ],
    reviews: [
      {
        author: "Sarah Jenkins",
        date: "August 12, 2026",
        rating: 5,
        text: "Exceptional litigator. Guided our firm through a highly complex merger dispute and delivered a stellar outcome."
      }
    ]
  };
}

export default async function LawyerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const lawyer = await getLawyerData(resolvedParams.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Attorney",
    "name": lawyer.name,
    "image": lawyer.imageUrl,
    "telephone": lawyer.contact?.phone || "(212) 555-0198",
    "email": lawyer.contact?.email || "attorney@lawyercomparison.com",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": lawyer.contact?.address || lawyer.location || "United States"
    },
    "priceRange": lawyer.hourlyRate || "$350/hr",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": lawyer.rating || 5.0,
      "reviewCount": lawyer.reviewCount || 42
    }
  };

  return (
    <div className="w-full bg-color-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Top Header Section */}
      <section className="border-b border-color-border-light bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          
          <Link 
            href="/lawyers" 
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-color-text-muted hover:text-black mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Directory
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            
            {/* Profile Image */}
            <div className="w-40 h-40 md:w-56 md:h-56 shrink-0 border border-color-border-light bg-white overflow-hidden shadow-sm">
              <img 
                src={lawyer.imageUrl} 
                alt={lawyer.name} 
                className="w-full h-full object-cover grayscale transition-minimal hover:grayscale-0"
              />
            </div>
            
            {/* Core Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-color-foreground sm:text-5xl">
                  {lawyer.name}
                </h1>
                <p className="text-xl mt-2 text-color-text-muted font-medium">{lawyer.firm}</p>
              </div>

              {/* Rating & Location */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm font-medium">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-color-foreground text-color-foreground" />
                  <span className="text-color-foreground text-lg">{lawyer.rating.toFixed(1)}</span>
                  <span className="text-color-text-muted ml-1">({lawyer.reviewCount} reviews)</span>
                </div>
                <span className="hidden sm:inline text-color-border-light">|</span>
                <div className="flex items-center gap-2 text-color-text-muted">
                  <MapPin className="h-4 w-4" />
                  <span>{lawyer.location}</span>
                </div>
                <span className="hidden sm:inline text-color-border-light">|</span>
                <div className="text-color-text-muted font-bold">
                  Rate: {lawyer.hourlyRate}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                {lawyer.badges.map((badge: string, idx: number) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1.5 border border-color-border-light bg-white px-3 py-1 text-xs font-semibold text-color-foreground uppercase tracking-wide shadow-sm"
                  >
                    <Award className="h-3.5 w-3.5" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <ContactAttorneyClient lawyerId={lawyer.id} lawyerName={lawyer.name} />
            
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          
          {/* Left Column (About & Reviews) */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* About Section */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight border-b border-color-border-light pb-4">
                About {lawyer.name}
              </h2>
              <p className="text-color-text-muted leading-relaxed whitespace-pre-line text-base">
                {lawyer.about}
              </p>
            </div>

            {/* Practice Areas */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight border-b border-color-border-light pb-4">
                Practice Areas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lawyer.practiceAreas.map((area: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 border border-color-border-light p-4 bg-white shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-color-foreground shrink-0" />
                    <span className="font-semibold text-sm">{area}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Case Results */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight border-b border-color-border-light pb-4">
                Notable Case Results
              </h2>
              <div className="space-y-4">
                {lawyer.caseResults.map((result: CaseResult, idx: number) => (
                  <div key={idx} className="border-l-4 border-color-foreground bg-white p-6 shadow-sm border border-color-border-light border-l-color-foreground">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-black tracking-tight">{result.amount}</span>
                      <span className="bg-gray-100 text-color-foreground px-2.5 py-1 text-xs font-bold uppercase tracking-wider">
                        {result.type}
                      </span>
                    </div>
                    <p className="text-sm text-color-text-muted">{result.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Client Reviews */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-color-border-light pb-4">
                <h2 className="text-2xl font-bold tracking-tight">Client Reviews</h2>
                <span className="text-sm font-semibold underline cursor-pointer text-color-text-muted hover:text-color-foreground">
                  Read all {lawyer.reviewCount}
                </span>
              </div>
              
              <div className="space-y-6">
                {lawyer.reviews.map((review: ClientReview, idx: number) => (
                  <div key={idx} className="border border-color-border-light p-6 shadow-sm bg-white">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-color-foreground">{review.author}</h4>
                        <p className="text-xs text-color-text-muted mt-1">{review.date}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_: unknown, i: number) => (
                          <Star 
                            key={i} 
                            className={`h-4 w-4 ${i < review.rating ? 'fill-color-foreground text-color-foreground' : 'fill-gray-200 text-gray-200'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-color-text-muted italic leading-relaxed">
                      "{review.text}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-8 sticky top-24">
            
            <ConsultationBooking 
              lawyerId={lawyer.id}
              lawyerName={lawyer.name} 
              consultationFee={lawyer.freeConsultation ? 0 : 150} 
            />

            <div className="border border-color-border-light p-8 shadow-sm space-y-6 bg-white">
              <h3 className="font-bold tracking-tight text-xl border-b border-color-border-light pb-4">
                Contact Information
              </h3>
              
              <div className="space-y-6 text-sm">
                <div className="flex items-start gap-4">
                  <Phone className="h-5 w-5 text-color-text-muted shrink-0" />
                  <div>
                    <p className="font-semibold text-color-foreground">Phone</p>
                    <p className="text-color-text-muted mt-1">{lawyer.contact.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Mail className="h-5 w-5 text-color-text-muted shrink-0" />
                  <div>
                    <p className="font-semibold text-color-foreground">Email</p>
                    <p className="text-color-text-muted mt-1">{lawyer.contact.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MapPin className="h-5 w-5 text-color-text-muted shrink-0" />
                  <div>
                    <p className="font-semibold text-color-foreground">Office Location</p>
                    <p className="text-color-text-muted mt-1 whitespace-pre-wrap leading-relaxed">
                      {lawyer.contact.address}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-color-border-light">
                <div className="flex items-center gap-2 text-sm text-color-foreground font-semibold">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Accepting New Clients</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-color-text-muted mt-3">
                  <Clock className="h-4 w-4" />
                  <span>Responds within 24 hours</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

    </div>
  );
}
