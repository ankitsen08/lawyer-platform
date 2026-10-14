"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [issue, setIssue] = useState("");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const SERVER_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lawyerId: "support",
          lawyerName: "LawyerComparison Enterprise Support",
          fullName,
          email,
          issue,
          description
        })
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      setIsSuccess(true);
      toast.success("Support ticket created. We will be in touch shortly.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit support ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-color-background px-6 py-20 lg:px-8 min-h-[80vh]">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* Left Col: Info */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-color-foreground sm:text-5xl">
              Get in Touch
            </h1>
            <p className="mt-6 text-lg text-color-text-muted">
              Whether you need help finding an attorney or you're a law firm looking to upgrade your profile, our enterprise support team is here to assist you 24/7.
            </p>
          </div>

          <div className="space-y-6 pt-8 border-t border-color-border-light">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 flex items-center justify-center bg-gray-50 border border-color-border-light text-color-foreground">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-color-foreground">Email Support</p>
                <p className="text-color-text-muted text-sm mt-1">support@lawyercomparison.com</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-12 w-12 flex items-center justify-center bg-gray-50 border border-color-border-light text-color-foreground">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-color-foreground">Call Us</p>
                <p className="text-color-text-muted text-sm mt-1">1-800-555-LAWS</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-12 w-12 flex items-center justify-center bg-gray-50 border border-color-border-light text-color-foreground">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-color-foreground">Headquarters</p>
                <p className="text-color-text-muted text-sm mt-1">100 Enterprise Way, Suite 300<br/>San Francisco, CA 94105</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Form */}
        <div className="bg-white border border-color-border-light p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-color-foreground mb-6">Send us a message</h2>
          
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 text-center h-full animate-in zoom-in">
              <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-2xl font-bold text-color-foreground mb-2">Message Sent</h3>
              <p className="text-color-text-muted">
                Our support team will respond to your inquiry within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-color-foreground">Full Name</label>
                <input 
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-color-border-light focus:border-color-foreground bg-transparent px-4 py-3 text-sm focus:outline-none transition-minimal"
                  placeholder="Jane Doe"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-color-foreground">Email Address</label>
                <input 
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-color-border-light focus:border-color-foreground bg-transparent px-4 py-3 text-sm focus:outline-none transition-minimal"
                  placeholder="jane@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-color-foreground">How can we help?</label>
                <select 
                  required
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  className="w-full border border-color-border-light focus:border-color-foreground bg-transparent px-4 py-3 text-sm focus:outline-none transition-minimal bg-white"
                >
                  <option value="">Select a topic...</option>
                  <option value="client-support">I am a client looking for help</option>
                  <option value="attorney-support">I am an attorney managing my profile</option>
                  <option value="billing">Billing Inquiry</option>
                  <option value="other">Other Inquiry</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-color-foreground">Message</label>
                <textarea 
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-color-border-light focus:border-color-foreground bg-transparent px-4 py-3 text-sm focus:outline-none transition-minimal resize-none"
                  placeholder="Please describe your issue..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-color-foreground text-color-background px-4 py-4 text-sm font-bold shadow-md hover:opacity-90 transition-minimal disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Sending...
                  </>
                ) : (
                  "Submit Message"
                )}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
