"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

const FAQS = [
  {
    question: "How do you verify the lawyers on your platform?",
    answer: "Every attorney listed on LawyerComparison must pass a rigorous 5-step verification process, which includes verifying their state bar standing, malpractice insurance, peer reviews, and client complaint history."
  },
  {
    question: "Is it free to use LawyerComparison to find a lawyer?",
    answer: "Yes, using LawyerComparison to search, compare, and contact attorneys is 100% free for clients. We do not take a cut of your settlement or charge booking fees."
  },
  {
    question: "What happens when I book a consultation?",
    answer: "Once you select a time slot, your secure details are sent directly to the attorney's office. They will contact you within 24 hours to confirm the appointment and provide any intake paperwork."
  },
  {
    question: "I am an attorney. How do I claim my profile?",
    answer: "Attorneys can claim or create a profile by visiting our 'For Lawyers' portal, selecting a membership tier, and undergoing our verification process."
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="w-full bg-color-background px-6 py-20 lg:px-8 min-h-[80vh]">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-color-foreground sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-lg text-color-text-muted">
            Find answers to common questions about using LawyerComparison.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => (
            <div 
              key={index}
              className="border border-color-border-light bg-white overflow-hidden transition-minimal"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between px-6 py-5 text-left focus:outline-none"
              >
                <span className="font-bold text-color-foreground pr-8">{faq.question}</span>
                <ChevronDown 
                  className={`h-5 w-5 text-color-text-muted transition-transform duration-300 flex-shrink-0 ${openIndex === index ? "rotate-180" : ""}`} 
                />
              </button>
              <div 
                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index ? "max-h-96 pb-5 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <p className="text-color-text-muted leading-relaxed text-sm">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center border-t border-color-border-light pt-8">
          <p className="text-color-text-muted">
            Still have questions?{" "}
            <Link href="/contact" className="font-bold text-color-foreground underline hover:no-underline">
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
