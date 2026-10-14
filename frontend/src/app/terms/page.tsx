import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="w-full bg-color-background px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-color-foreground mb-4">Terms of Service</h1>
        <p className="text-sm text-color-text-muted mb-12">Last Updated: September 29, 2026</p>

        <div className="prose prose-sm sm:prose-base prose-neutral max-w-none text-color-text-muted space-y-6">
          <h2 className="text-xl font-bold text-color-foreground mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using LawyerComparison ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2 className="text-xl font-bold text-color-foreground mt-8 mb-4">2. Platform Purpose</h2>
          <p>
            LawyerComparison is a directory and lead generation platform. We do not provide legal advice, nor are we a law firm. The information provided on this platform is for informational purposes only.
          </p>

          <h2 className="text-xl font-bold text-color-foreground mt-8 mb-4">3. Attorney-Client Relationship</h2>
          <p>
            Using this platform or communicating with an attorney through our contact forms does not establish an attorney-client relationship. Such a relationship is only formed when you and the attorney sign a formal engagement agreement.
          </p>

          <h2 className="text-xl font-bold text-color-foreground mt-8 mb-4">4. User Responsibilities</h2>
          <p>
            You agree not to use the platform for any illegal or unauthorized purpose. You must not, in the use of the Service, violate any laws in your jurisdiction.
          </p>
        </div>

        <div className="mt-16 pt-8 border-t border-color-border-light">
          <Link href="/contact" className="text-sm font-bold text-color-foreground underline hover:no-underline">
            Contact us regarding these terms
          </Link>
        </div>
      </div>
    </div>
  );
}
