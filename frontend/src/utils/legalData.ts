export interface AttachmentItem {
  name: string;
  size: number;
  mimeType: string;
  dataUrl: string;
  uploadedAt?: string;
}

export const LEGAL_TAXONOMY: Record<string, string[]> = {
  "Personal Injury & Accidents": [
    "Auto & Motorcycle Accidents",
    "Medical Malpractice",
    "Slip & Fall / Premises Liability",
    "Workplace Injury / Workers' Comp",
    "Wrongful Death",
    "Product Liability"
  ],
  "Family Law & Divorce": [
    "Divorce & Legal Separation",
    "Child Custody & Visitation",
    "Child Support & Alimony",
    "Prenuptial / Postnuptial Agreements",
    "Adoption & Guardianship",
    "Domestic Violence Protection Order"
  ],
  "Criminal Defense & Traffic": [
    "DUI / DWI Defense",
    "Felony Charges",
    "Misdemeanor & Traffic Citations",
    "White Collar Defense",
    "Drug Offenses",
    "Expungement & Record Sealing"
  ],
  "Business & Corporate Law": [
    "Business Formation (LLC / Corp)",
    "Contract Drafting & Breach Disputes",
    "Mergers & Acquisitions",
    "Shareholder / Partnership Disputes",
    "Intellectual Property & Trademarks",
    "Commercial Litigation"
  ],
  "Real Estate & Property Disputes": [
    "Residential Purchase / Sale",
    "Commercial Leasing",
    "Landlord / Tenant Eviction",
    "Foreclosure Defense",
    "Zoning & Land Use",
    "Title & Boundary Disputes"
  ],
  "Employment & Labor Rights": [
    "Wrongful Termination",
    "Discrimination & Harassment",
    "Wage, Hour & Overtime Claims",
    "Severance & Non-Compete Review",
    "Whistleblower / Retaliation"
  ],
  "Estate Planning & Wills": [
    "Wills & Living Trusts",
    "Probate & Estate Administration",
    "Power of Attorney & Directives",
    "Asset Protection",
    "Elder Law & Medicaid Planning"
  ],
  "Immigration & Visas": [
    "Employment & Work Visas (H-1B / L-1)",
    "Family-Based Green Cards",
    "Citizenship & Naturalization",
    "Asylum & Deportation Defense",
    "Investor & Business Visas"
  ],
  "Bankruptcy & Financial Debt": [
    "Chapter 7 Consumer Liquidation",
    "Chapter 13 Wage Earner Plan",
    "Chapter 11 Business Restructuring",
    "Creditor Harassment Defense",
    "Tax Debt Settlement"
  ],
  "General Practice / Civil Litigation": [
    "Small Claims & Consumer Disputes",
    "Defamation & Privacy",
    "Insurance Coverage Disputes",
    "Civil Appeals",
    "General Legal Counsel"
  ]
};

export const PRIMARY_CATEGORIES = Object.keys(LEGAL_TAXONOMY);

export function getSubCategories(primaryCategory: string): string[] {
  return LEGAL_TAXONOMY[primaryCategory] || LEGAL_TAXONOMY["General Practice / Civil Litigation"];
}

export const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }
];

export const STATE_SELECT_OPTIONS = US_STATES.map((st) => ({
  value: st.code,
  label: `${st.name} (${st.code})`,
  searchKeywords: `${st.name} ${st.code}`
}));

export const CATEGORY_SELECT_OPTIONS = PRIMARY_CATEGORIES.map((cat) => ({
  value: cat,
  label: cat
}));

export function getSubCategorySelectOptions(primaryCategory: string) {
  return getSubCategories(primaryCategory).map((sub) => ({
    value: sub,
    label: sub
  }));
}

export const URGENCY_TIERS = [
  { id: "immediate" as const, label: "Immediate / Court Date", sub: "Hearing, arrest, or deadline within 48h" },
  { id: "this_week" as const, label: "This Week", sub: "Active matter needing counsel within 7 days" },
  { id: "exploratory" as const, label: "Exploratory", sub: "Researching options & planning ahead" }
];

export const CONTACT_METHODS = [
  { id: "email" as const, label: "Email" },
  { id: "phone" as const, label: "Phone Call" },
  { id: "sms" as const, label: "SMS" },
  { id: "whatsapp" as const, label: "WhatsApp" }
];

export const BUDGET_RANGES = [
  { id: "under_2k" as const, label: "Under $2K", sub: "Flat fee / Document review" },
  { id: "2k_5k" as const, label: "$2K – $5K", sub: "Standard retainer / Negotiation" },
  { id: "5k_15k" as const, label: "$5K – $15K", sub: "Full representation" },
  { id: "15k_plus" as const, label: "$15K+", sub: "Complex litigation" },
  { id: "contingency" as const, label: "Contingency / Fee-Share", sub: "No upfront fee (Pay if you win)" },
  { id: "pro_bono" as const, label: "Pro Bono / Legal Aid", sub: "Income-qualified assistance" }
];

/**
 * Formats user-typed phone numbers cleanly into (XXX) XXX-XXXX US mask format.
 */
export function formatPhoneMask(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function normalizeUrgencyClient(val?: string): "immediate" | "this_week" | "exploratory" {
  if (!val) return "this_week";
  if (val === "immediate" || val === "emergency" || val === "urgent_24h") return "immediate";
  if (val === "exploratory" || val === "planning" || val === "general") return "exploratory";
  return "this_week";
}

export function normalizeBudgetClient(val?: string): "under_2k" | "2k_5k" | "5k_15k" | "15k_plus" | "contingency" | "pro_bono" {
  if (!val) return "contingency";
  if (val === "contingency_only" || val === "contingency") return "contingency";
  if (val === "under_2k" || val === "2k_5k" || val === "5k_15k" || val === "15k_plus" || val === "pro_bono") return val;
  return "contingency";
}

export function normalizeContactMethodClient(val?: string): "email" | "phone" | "sms" | "whatsapp" {
  if (val === "text" || val === "sms") return "sms";
  if (val === "phone" || val === "whatsapp" || val === "email") return val;
  return "email";
}

export function getUrgencyMeta(val?: string) {
  const norm = normalizeUrgencyClient(val);
  return URGENCY_TIERS.find(u => u.id === norm) || URGENCY_TIERS[1];
}

export function getBudgetLabel(val?: string): string {
  const norm = normalizeBudgetClient(val);
  return BUDGET_RANGES.find(b => b.id === norm)?.label || "Contingency / Fee-Share";
}

export function getContactMethodLabel(val?: string): string {
  const norm = normalizeContactMethodClient(val);
  return CONTACT_METHODS.find(c => c.id === norm)?.label || "Email";
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const ACCEPTED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif"
]);

export function readValidatedAttachment(file: File): Promise<AttachmentItem> {
  return new Promise((resolve, reject) => {
    const mime = file.type.toLowerCase();
    if (!ACCEPTED_MIME.has(mime)) {
      reject(new Error(`Unsupported file "${file.name}". Please upload PDF, PNG, JPG, or WEBP files.`));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error(`File "${file.name}" exceeds the 2MB maximum size limit.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve({
        name: file.name,
        size: file.size,
        mimeType: mime,
        dataUrl: result,
        uploadedAt: new Date().toISOString()
      });
    };
    reader.onerror = () => reject(new Error(`Could not read "${file.name}"`));
    reader.readAsDataURL(file);
  });
}

