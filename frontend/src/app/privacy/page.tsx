import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="w-full bg-color-background px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-color-foreground mb-4">Privacy Policy</h1>
        <p className="text-sm text-color-text-muted mb-12">Last Updated: September 29, 2026</p>

        <div className="prose prose-sm sm:prose-base prose-neutral max-w-none text-color-text-muted space-y-6">
          <h2 className="text-xl font-bold text-color-foreground mt-8 mb-4">1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us.
          </p>

          <h2 className="text-xl font-bold text-color-foreground mt-8 mb-4">2. How We Use Information</h2>
          <p>
            We use the information we collect to connect you with legal professionals, provide, maintain, and improve our services, and to process and facilitate transactions and payments.
          </p>

          <h2 className="text-xl font-bold text-color-foreground mt-8 mb-4">3. Data Security</h2>
          <p>
            We use industry-standard encryption and security measures to protect your personal and case-related data. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
          </p>
        </div>

        <div className="mt-16 pt-8 border-t border-color-border-light">
          <Link href="/contact" className="text-sm font-bold text-color-foreground underline hover:no-underline">
            Contact our Privacy Officer
          </Link>
        </div>
      </div>
    </div>
  );
}
