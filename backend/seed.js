const mongoose = require('mongoose');
const User = require('./models/User');
const Question = require('./models/Question');
const Answer = require('./models/Answer');
const Consultation = require('./models/Consultation');
const { hashPassword } = require('./utils/auth');

const INITIAL_LAWYERS = [
  {
    email: "robert.pearson@ph-law.com",
    role: "lawyer",
    name: "Robert H. Pearson",
    firstName: "Robert",
    lastName: "Pearson",
    firmName: "Pearson & Hardman LLP",
    rating: 4.9,
    reviewCount: 342,
    hourlyRate: "450",
    specialty: "Corporate Litigation",
    practiceAreas: ["Corporate Litigation", "Mergers & Acquisitions", "White Collar Defense", "Securities Law"],
    experienceYears: 24,
    location: "New York, NY",
    imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format&fit=crop&q=80",
    bio: "Specializing in corporate litigation and high-stakes mergers. With over 20 years of experience in the New York district, Mr. Pearson has a proven track record of securing favorable verdicts for Fortune 500 companies.",
    about: "Robert H. Pearson is a founding partner at Pearson & Hardman LLP, widely recognized as one of the preeminent corporate litigation attorneys in New York. With over two decades of experience, he has successfully represented Fortune 500 companies, financial institutions, and high-net-worth individuals in complex, high-stakes disputes.",
    consultationAvailability: "Within 24 Hours",
    freeConsultation: true,
    languages: ["English"],
    isVerified: true,
    onboarded: true,
    plan: "Premium Tier"
  },
  {
    email: "eleanor.vance@vancelaw.com",
    role: "lawyer",
    name: "Eleanor Vance",
    firstName: "Eleanor",
    lastName: "Vance",
    firmName: "Vance Family Law Group",
    rating: 4.7,
    reviewCount: 128,
    hourlyRate: "320",
    specialty: "Family Law",
    practiceAreas: ["Family Law", "Divorce & Separation", "Child Custody", "Asset Division"],
    experienceYears: 15,
    location: "Chicago, IL",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=60",
    bio: "A compassionate yet aggressive advocate in family law. Eleanor handles complex divorce, custody, and asset division cases with utmost discretion and professional rigor.",
    about: "Eleanor Vance brings over 15 years of dedicated experience guiding clients through delicate domestic and family matters.",
    consultationAvailability: "Same Day",
    freeConsultation: true,
    languages: ["English", "French"],
    isVerified: true,
    onboarded: true,
    plan: "Premium Tier"
  },
  {
    email: "michael.sterling@sterlingdefense.com",
    role: "lawyer",
    name: "Michael Sterling",
    firstName: "Michael",
    lastName: "Sterling",
    firmName: "Sterling Defense Associates",
    rating: 4.8,
    reviewCount: 215,
    hourlyRate: "380",
    specialty: "Criminal Defense",
    practiceAreas: ["Criminal Defense", "DUI & DWI", "Federal Appeals", "White Collar Crime"],
    experienceYears: 18,
    location: "Los Angeles, CA",
    imageUrl: "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=500&auto=format&fit=crop&q=60",
    bio: "Former federal prosecutor turned top-tier criminal defense attorney. Michael brings unparalleled insight into the prosecution's strategies, ensuring the most robust defense possible.",
    about: "Mr. Sterling has litigated over 200 jury trials with an extraordinary defense acquittal rate.",
    consultationAvailability: "Immediate (24/7)",
    freeConsultation: false,
    languages: ["English", "Spanish"],
    isVerified: true,
    onboarded: true,
    plan: "Premium Tier"
  },
  {
    email: "sarah.jenkins@jenkinsip.com",
    role: "lawyer",
    name: "Sarah Jenkins",
    firstName: "Sarah",
    lastName: "Jenkins",
    firmName: "Jenkins Intellectual Property",
    rating: 5.0,
    reviewCount: 89,
    hourlyRate: "410",
    specialty: "Intellectual Property",
    practiceAreas: ["Intellectual Property", "Patents", "Trademarks", "Tech Licensing"],
    experienceYears: 12,
    location: "San Francisco, CA",
    imageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&auto=format&fit=crop&q=60",
    bio: "Pioneering patent and trademark attorney for tech startups and enterprise software firms. Sarah protects your most valuable intangible assets from infringement and dilution.",
    about: "Sarah works closely with venture-backed AI, biotechnology, and SaaS startups to secure global patents.",
    consultationAvailability: "Within 48 Hours",
    freeConsultation: true,
    languages: ["English", "Mandarin"],
    isVerified: true,
    onboarded: true,
    plan: "Standard Tier"
  },
  {
    email: "david.chen@chenrealestate.com",
    role: "lawyer",
    name: "David Chen",
    firstName: "David",
    lastName: "Chen",
    firmName: "Chen Real Estate Partners",
    rating: 4.6,
    reviewCount: 174,
    hourlyRate: "295",
    specialty: "Real Estate Law",
    practiceAreas: ["Real Estate Law", "Commercial Leasing", "Zoning & Land Use", "Property Disputes"],
    experienceYears: 20,
    location: "Seattle, WA",
    imageUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=60",
    bio: "Expert counsel in commercial real estate transactions, zoning laws, and property disputes. David facilitates smooth, legally sound multi-million dollar property developments.",
    about: "Counseling real estate investment trusts (REITs) and commercial developers across the Pacific Northwest.",
    consultationAvailability: "Within 24 Hours",
    freeConsultation: true,
    languages: ["English", "Mandarin"],
    isVerified: true,
    onboarded: true,
    plan: "Standard Tier"
  }
];

const INITIAL_CLIENTS = [
  {
    email: "adityavishwa02@gmail.com",
    role: "client",
    firstName: "Aditya",
    lastName: "Vishwa",
    phone: "(555) 123-4567"
  }
];

async function seedDatabase() {
  try {
    const lawyerCount = await User.countDocuments({ role: 'lawyer' });
    if (lawyerCount === 0) {
      console.log('[*] Seeding default attorneys and clients...');
      
      const defaultPasswordHash = hashPassword('password123');

      // Seed lawyers
      const createdLawyers = [];
      for (const lawyerData of INITIAL_LAWYERS) {
        const user = await User.create({
          ...lawyerData,
          passwordHash: defaultPasswordHash
        });
        createdLawyers.push(user);
      }

      // Seed clients
      const createdClients = [];
      for (const clientData of INITIAL_CLIENTS) {
        const client = await User.create({
          ...clientData,
          passwordHash: defaultPasswordHash
        });
        createdClients.push(client);
      }

      const client = createdClients[0];
      const robert = createdLawyers[0];
      const eleanor = createdLawyers[1];

      // Seed initial consultations
      if (client && robert) {
        await Consultation.create([
          {
            clientId: client._id.toString(),
            clientName: `${client.firstName} ${client.lastName}`,
            clientEmail: client.email,
            clientPhone: client.phone,
            lawyerId: robert._id.toString(),
            lawyerName: robert.name || robert.firmName,
            topic: "Corporate Litigation Review",
            date: "Tomorrow",
            time: "2:00 PM EST",
            zoomLink: "https://zoom.us/j/123456789",
            status: "upcoming",
            consultationFee: 0
          },
          {
            clientId: client._id.toString(),
            clientName: `${client.firstName} ${client.lastName}`,
            clientEmail: client.email,
            clientPhone: client.phone,
            lawyerId: eleanor._id.toString(),
            lawyerName: eleanor.name || eleanor.firmName,
            topic: "Business Asset Agreement Discussion",
            date: "Sep 15, 2026",
            time: "10:00 AM EST",
            zoomLink: "https://zoom.us/j/987654321",
            status: "completed",
            consultationFee: 0
          }
        ]);
      }

      // Seed sample questions and answers
      if (client && robert) {
        const q1 = await Question.create({
          clientId: client._id.toString(),
          clientName: `${client.firstName} ${client.lastName}`,
          title: "Can my employer enforce a non-compete clause in New York state?",
          content: "I recently resigned from a fintech consulting company in Manhattan. My employment contract contained a 12-month nationwide non-compete clause prohibiting me from working with any competitors in the financial software industry. I received a lucrative offer from another firm. Can they legally block me?",
          category: "Employment Law",
          location: "New York, NY",
          status: "answered"
        });

        await Answer.create({
          questionId: q1._id.toString(),
          lawyerId: robert._id.toString(),
          lawyerName: robert.name,
          lawyerFirm: robert.firmName,
          lawyerSpecialty: robert.specialty,
          lawyerImage: robert.imageUrl,
          content: "In New York, non-compete agreements are subject to strict scrutiny and are disfavored by courts unless they are reasonable in time and geographic scope, necessary to protect the employer's legitimate trade secrets or confidential information, and not unduly burdensome on the employee. Under the New York Court of Appeals precedent (BDO Seidman v. Hirshberg), nationwide clauses for mid-level consultants are frequently ruled unenforceable or drastically narrowed by blue-penciling.",
          upvotes: 42
        });

        const q2 = await Question.create({
          clientId: client._id.toString(),
          clientName: "Anonymous Client",
          title: "What steps are required to protect trade secrets before pitching angel investors?",
          content: "Our startup is preparing to demo proprietary generative AI models to potential venture capital and angel investors. Should we insist on a mutual NDA, or does that scare away investors? What other legal safeguards can we enforce?",
          category: "Intellectual Property",
          location: "San Francisco, CA",
          status: "answered"
        });

        await Answer.create({
          questionId: q2._id.toString(),
          lawyerId: createdLawyers[3]._id.toString(),
          lawyerName: createdLawyers[3].name,
          lawyerFirm: createdLawyers[3].firmName,
          lawyerSpecialty: createdLawyers[3].specialty,
          lawyerImage: createdLawyers[3].imageUrl,
          content: "Most institutional VCs will refuse to sign NDAs during initial pitch meetings. Instead, protect yourself by patenting patent-eligible algorithmic workflows, keeping source code strictly proprietary, watermarking presentation materials, and only disclosing high-level architecture rather than exact parameters or training datasets.",
          upvotes: 18
        });

        // Open question for lawyers to answer in the dashboard
        await Question.create({
          clientId: client._id.toString(),
          clientName: "Commercial Tenant",
          title: "Can commercial landlords raise common area maintenance (CAM) charges retroactively?",
          content: "Our lease specifies quarterly CAM estimates, but our building manager just sent a retroactive bill for $18,000 dating back 18 months claiming rising HVAC utility costs. Are retroactive adjustments legally permitted?",
          category: "Real Estate Law",
          location: "Chicago, IL",
          status: "open"
        });
      }

      console.log('[+] Database successfully seeded with verified attorneys, consultations, and Q&A entries.');
    }
  } catch (err) {
    console.error('[-] Seeding error:', err.message);
  }
}

module.exports = { seedDatabase, INITIAL_LAWYERS };
