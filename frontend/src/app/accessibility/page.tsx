import Link from "next/link";

export default function AccessibilityPage() {
  return (
    <div className="w-full bg-color-background px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-color-foreground mb-4">Accessibility Statement</h1>
        <p className="text-sm text-color-text-muted mb-12">Last Updated: September 29, 2026</p>

        <div className="prose prose-sm sm:prose-base prose-neutral max-w-none text-color-text-muted space-y-6">
          <p>
            LawyerComparison is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.
          </p>

          <h2 className="text-xl font-bold text-color-foreground mt-8 mb-4">Conformance Status</h2>
          <p>
            The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers to improve accessibility for people with disabilities. LawyerComparison strives to be partially conformant with WCAG 2.1 level AA.
          </p>

          <h2 className="text-xl font-bold text-color-foreground mt-8 mb-4">Feedback</h2>
          <p>
            We welcome your feedback on the accessibility of LawyerComparison. Please let us know if you encounter accessibility barriers on our platform.
          </p>
        </div>

        <div className="mt-16 pt-8 border-t border-color-border-light">
          <Link href="/contact" className="text-sm font-bold text-color-foreground underline hover:no-underline">
            Report an Accessibility Issue
          </Link>
        </div>
      </div>
    </div>
  );
}
