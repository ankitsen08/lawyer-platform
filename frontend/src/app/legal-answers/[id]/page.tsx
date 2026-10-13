import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck, MessageSquare, ThumbsUp } from "lucide-react";
import { MOCK_QUESTIONS } from "@/data/mockQuestions";
import QuestionActions from "@/components/legal-answers/QuestionActions";
import { getServerUrl } from "@/utils/apiUrl";

export const dynamicParams = true;

export function generateStaticParams() {
  return MOCK_QUESTIONS.map((q) => ({
    id: q.id,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const question = await getQuestion(id);

  if (!question) {
    return { title: "Legal Question | LawyerComparison" };
  }

  return {
    title: `${question.title} - ${question.category} Advice | LawyerComparison`,
    description: question.content ? question.content.slice(0, 160) : "Read verified attorney answers on LawyerComparison.",
    openGraph: {
      title: question.title,
      description: question.content ? question.content.slice(0, 160) : "Legal Q&A on LawyerComparison.",
    },
  };
}

async function getQuestion(id: string) {
  try {
    const SERVER_URL = getServerUrl();
    const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/qa/questions/${id}`, {
      next: { revalidate: 30 }
    });
    if (res.ok) {
      const q = await res.json();
      if (q && q.title) {
        return {
          id: q._id || id,
          title: q.title,
          category: q.category,
          location: q.location || "United States",
          askedDate: new Date(q.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          content: q.content,
          answers: q.answers || []
        };
      }
    }
  } catch (error) {
    // Fallback
  }

  const mock = MOCK_QUESTIONS.find((q) => q.id === id);
  if (mock) {
    return {
      id: mock.id,
      title: mock.title,
      category: mock.category,
      location: mock.location,
      askedDate: mock.askedDate,
      content: mock.content,
      answers: [
        {
          _id: "ans-mock-1",
          lawyerId: "lwy-001",
          lawyerName: mock.topAnswer.lawyerName,
          lawyerFirm: mock.topAnswer.lawyerFirm,
          lawyerImage: mock.topAnswer.lawyerImage,
          content: mock.topAnswer.preview,
          upvotes: mock.topAnswer.upvotes
        }
      ]
    };
  }

  return null;
}

export default async function LegalAnswerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const question = await getQuestion(id);

  if (!question) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Question Not Found</h2>
        <p className="text-sm text-neutral-500 mb-6">The legal question you are searching for may have been removed or archived.</p>
        <Link 
          href="/legal-answers"
          className="bg-black text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity"
        >
          Back to Q&A Forum
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-color-background flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-6 py-12 lg:px-8 flex-1">
        
        <Link 
          href="/legal-answers" 
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-color-text-muted hover:text-black transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Q&A
        </Link>

        <div className="bg-white border border-color-border-light p-8 lg:p-12 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-neutral-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black">
              {question.category}
            </span>
            <span className="text-xs text-color-text-muted font-medium">
              {question.location} • {question.askedDate}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-black mb-6 leading-tight">
            {question.title}
          </h1>

          <p className="text-base text-neutral-600 leading-relaxed mb-12">
            {question.content}
          </p>

          <h3 className="text-xl font-bold border-b border-neutral-200 pb-4 mb-6">
            Attorney Answers ({question.answers?.length || 0})
          </h3>

          {question.answers && question.answers.length > 0 ? (
            <div className="space-y-8">
              {question.answers.map((ans: any, idx: number) => (
                <div key={ans._id || idx} className="flex items-start gap-5 pt-6 border-t border-neutral-100 first:border-t-0 first:pt-0">
                  <img 
                    src={ans.lawyerImage || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=60"} 
                    alt={ans.lawyerName || "Attorney"} 
                    className="w-12 h-12 object-cover grayscale shrink-0 border border-neutral-200"
                  />
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <span className="font-bold text-base text-black">{ans.lawyerName || "Verified Attorney"}</span>
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-color-text-muted">Verified Attorney • {ans.lawyerFirm || "Independent Practice"}</span>
                      </div>
                    </div>
                    <p className="text-base text-neutral-800 leading-relaxed whitespace-pre-line mb-4">
                      {ans.content}
                    </p>
                    
                    <QuestionActions initialUpvotes={ans.upvotes || 0} lawyerId={ans.lawyerId || "lwy-001"} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-50 p-8 border border-neutral-200 text-center">
              <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-600">Awaiting attorney responses.</p>
              <p className="text-xs text-neutral-400 mt-1">Verified attorneys are notified of new questions in their practice area.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
