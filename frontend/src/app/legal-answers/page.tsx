"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MessageSquare, ChevronRight, ShieldCheck, ThumbsUp, ArrowRight, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import AskQuestionModal from "@/components/modals/AskQuestionModal";
import { getServerUrl } from "@/utils/apiUrl";

interface Answer {
  _id: string;
  content: string;
  upvotes: number;
  lawyerId: {
    _id: string;
    firmName?: string;
    specialty?: string;
  };
  createdAt: string;
}

interface Question {
  _id: string;
  title: string;
  content: string;
  category: string;
  location: string;
  status: string;
  answers: Answer[];
  createdAt: string;
}

function LegalAnswersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");
  
  const { clientSession, lawyerSession } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const SERVER_URL = getServerUrl();
      let url = `${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/qa/questions`;
      if (categoryFilter) {
        url += `?category=${encodeURIComponent(categoryFilter)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [categoryFilter]);

  // Filter by search query locally
  const displayedQuestions = questions.filter(q => {
    if (searchQuery && !q.title.toLowerCase().includes(searchQuery.toLowerCase()) && !q.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }).slice(0, visibleCount);

  const handleAskNow = () => {
    if (clientSession.isAuthenticated) {
      setIsAskModalOpen(true);
    } else {
      router.push("/client-login");
    }
  };

  const handleStartAnswering = () => {
    if (lawyerSession.isAuthenticated) {
      router.push("/attorney-dashboard");
    } else {
      router.push("/login");
    }
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 5);
  };

  return (
    <div className="w-full min-h-screen bg-color-background flex flex-col">
      
      {/* Hero Section */}
      <section className="bg-color-foreground text-color-background py-20 px-6 lg:px-8 border-b-8 border-neutral-800">
        <div className="mx-auto max-w-4xl text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Free Legal Advice.<br />From Verified Attorneys.
          </h1>
          <p className="text-lg text-neutral-400 font-medium max-w-2xl mx-auto">
            Search thousands of answered legal questions, or ask your own anonymously and get guidance from top-rated lawyers in your state.
          </p>
          
          {/* Search/Ask Bar */}
          <div className="relative max-w-2xl mx-auto mt-8 flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-neutral-500" />
            <input 
              type="text" 
              placeholder="E.g., Can I break my lease early without penalty?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 text-white pl-12 pr-32 py-4 rounded-none focus:outline-none focus:border-white transition-colors"
            />
            <button 
              onClick={handleAskNow}
              className="absolute right-2 bg-white text-black px-6 py-2 text-sm font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors"
            >
              Ask Now
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-5xl w-full px-6 py-16 lg:px-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        
        {/* Left Column: Question Feed */}
        <div className="lg:col-span-2 space-y-10">
          <div className="flex items-center justify-between border-b border-color-border-light pb-4">
            <h2 className="text-2xl font-bold tracking-tight text-color-foreground">
              {categoryFilter ? `${categoryFilter} Questions` : "Recent Legal Answers"}
            </h2>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-black" />
            </div>
          ) : displayedQuestions.length === 0 ? (
            <div className="bg-neutral-50 border border-neutral-200 p-12 text-center flex flex-col items-center">
              <MessageSquare className="w-12 h-12 text-neutral-300 mb-4" />
              <h3 className="text-lg font-bold text-neutral-700">No questions found</h3>
              <p className="text-sm text-neutral-500 mt-2">Be the first to ask a question in this category.</p>
              <button 
                onClick={handleAskNow}
                className="mt-6 border-2 border-black px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
              >
                Ask a Question
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {displayedQuestions.map((q) => {
                const topAnswer = q.answers?.length > 0 ? q.answers[0] : null;

                return (
                  <article key={q._id} className="border border-color-border-light bg-white p-6 shadow-sm hover:shadow-md transition-shadow group">
                    
                    {/* Question Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-neutral-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black">
                        {q.category}
                      </span>
                      <span className="text-xs text-color-text-muted font-medium">
                        {q.location} • {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Question Title & Content */}
                    <Link href={`/legal-answers/${q._id}`}>
                      <h3 className="text-xl font-bold text-color-foreground mb-3 leading-snug group-hover:underline decoration-2 underline-offset-4 cursor-pointer">
                        {q.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-color-text-muted line-clamp-2 mb-6">
                      {q.content}
                    </p>

                    {/* Top Answer Block */}
                    {topAnswer && (
                      <div className="bg-neutral-50 border-l-4 border-black p-5 relative">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-neutral-500 shrink-0">
                            {topAnswer.lawyerId?.firmName?.charAt(0) || "L"}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm text-color-foreground">Attorney Response</span>
                              <ShieldCheck className="w-4 h-4 text-green-600" />
                              <span className="text-xs text-color-text-muted hidden sm:inline">• {topAnswer.lawyerId?.firmName || "Verified Lawyer"}</span>
                            </div>
                            <p className="text-sm text-color-foreground leading-relaxed italic line-clamp-3">
                              "{topAnswer.content}"
                            </p>
                            
                            {/* Interaction Footer */}
                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                                <ThumbsUp className="w-3.5 h-3.5" />
                                {topAnswer.upvotes || 0} upvotes
                              </div>
                              <Link href={`/legal-answers/${q._id}`} className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-black hover:text-neutral-500 transition-colors">
                                Read Full Answer <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Question Footer */}
                    <div className="mt-6 pt-4 border-t border-color-border-light flex items-center gap-2 text-sm font-medium text-color-text-muted">
                      <MessageSquare className="w-4 h-4" />
                      {q.answers?.length || 0} Attorney Answers
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          
          {!loading && displayedQuestions.length < questions.length && (
            <button 
              onClick={handleLoadMore}
              className="w-full border-2 border-black py-4 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
            >
              Load More Questions
            </button>
          )}
        </div>

        {/* Right Column: Sidebar (Lead Gen for Lawyers) */}
        <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start h-max">
          <div className="bg-black text-white p-8">
            <h3 className="text-xl font-bold mb-4">Are you an Attorney?</h3>
            <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
              Demonstrate your expertise, build peer trust, and connect with high-intent clients by answering questions in your jurisdiction.
            </p>
            <button 
              onClick={handleStartAnswering}
              className="w-full bg-white text-black py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors"
            >
              Start Answering
            </button>
          </div>

          <div className="border border-color-border-light p-6">
            <h3 className="font-bold tracking-tight text-lg mb-6 border-b border-color-border-light pb-4">Popular Topics</h3>
            <ul className="space-y-4">
              {["Divorce & Separation", "Child Custody", "DUI & DWI", "Car Accidents", "Wrongful Termination", "Estate Planning"].map((topic) => (
                <li key={topic}>
                  <Link href={`/legal-answers?category=${encodeURIComponent(topic)}`} className="group flex items-center justify-between text-sm font-medium text-color-text-muted hover:text-black transition-colors">
                    {topic}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

      </section>

      <AskQuestionModal 
        isOpen={isAskModalOpen} 
        onClose={() => {
          setIsAskModalOpen(false);
          fetchQuestions(); // Refresh feed after asking
        }} 
      />
    </div>
  );
}

export default function LegalAnswersForum() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-color-background flex items-center justify-center font-bold">Loading...</div>}>
      <LegalAnswersContent />
    </Suspense>
  );
}
