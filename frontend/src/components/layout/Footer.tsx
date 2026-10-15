import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 border-color-border-light bg-white bg-color-background py-12 px-6 lg:px-8">
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand Section */}
        <div className="flex flex-col space-y-4">
          <div className="font-bold text-xl tracking-tight flex items-center gap-2">
            <img 
              src="/logo.jpg" 
              alt="LawyerComparison Logo" 
              width={32}
              height={32}
              style={{ width: "32px", height: "32px", minWidth: "32px", minHeight: "32px", maxWidth: "32px", maxHeight: "32px" }}
              className="h-8 w-8 object-contain rounded-full border border-neutral-200 border-color-border-light grayscale hover:grayscale-0 transition-all" 
            />
            <span className="text-neutral-900 text-color-foreground font-bold">LawyerComparison</span>
          </div>
          <p className="text-neutral-500 text-color-text-muted text-sm max-w-xs leading-relaxed">
            The standard for finding premium legal representation across the United States.
          </p>
        </div>

        {/* Directory Links */}
        <div className="flex flex-col space-y-3">
          <h3 className="font-bold text-sm tracking-widest uppercase mb-2 text-neutral-900 text-color-foreground">Directory</h3>
          <Link href="/find" className="text-sm text-neutral-600 text-color-text-muted hover:text-black hover:text-color-foreground transition-minimal">
            Find a Lawyer
          </Link>
          <Link href="/categories" className="text-sm text-neutral-600 text-color-text-muted hover:text-black hover:text-color-foreground transition-minimal">
            Practice Areas
          </Link>
          <Link href="/locations" className="text-sm text-neutral-600 text-color-text-muted hover:text-black hover:text-color-foreground transition-minimal">
            Locations
          </Link>
          <Link href="/compare" className="text-sm text-neutral-600 text-color-text-muted hover:text-black hover:text-color-foreground transition-minimal">
            Compare Firms
          </Link>
        </div>

        {/* Support Links */}
        <div className="flex flex-col space-y-3">
          <h3 className="font-bold text-sm tracking-widest uppercase mb-2 text-neutral-900 text-color-foreground">Support</h3>
          <Link href="/faq" className="text-sm text-neutral-600 text-color-text-muted hover:text-black hover:text-color-foreground transition-minimal">
            FAQ
          </Link>
          <Link href="/contact" className="text-sm text-neutral-600 text-color-text-muted hover:text-black hover:text-color-foreground transition-minimal">
            Contact Us
          </Link>
          <Link href="/lawyer-help" className="text-sm text-neutral-600 text-color-text-muted hover:text-black hover:text-color-foreground transition-minimal">
            For Lawyers
          </Link>
        </div>

        {/* Legal Links */}
        <div className="flex flex-col space-y-3">
          <h3 className="font-bold text-sm tracking-widest uppercase mb-2 text-neutral-900 text-color-foreground">Legal</h3>
          <Link href="/terms" className="text-sm text-neutral-600 text-color-text-muted hover:text-black hover:text-color-foreground transition-minimal">
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-sm text-neutral-600 text-color-text-muted hover:text-black hover:text-color-foreground transition-minimal">
            Privacy Policy
          </Link>
          <Link href="/accessibility" className="text-sm text-neutral-600 text-color-text-muted hover:text-black hover:text-color-foreground transition-minimal">
            Accessibility
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl mt-12 pt-8 border-t border-neutral-200 border-color-border-light flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-neutral-500 text-color-text-muted">
            &copy; {currentYear} LawyerComparison. All rights reserved.
          </p>
          <p className="text-[10px] text-neutral-400 font-medium">
            LawyerComparison is not a law firm or a substitute for an attorney or law firm. Use of this site does not create an attorney-client relationship.
          </p>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 text-color-text-muted">
          Attorney Advertising
        </p>
      </div>
    </footer>
  );
}
