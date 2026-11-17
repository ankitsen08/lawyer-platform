import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { Loader2, MessageSquare, CheckCircle } from "lucide-react";
import { getServerUrl } from "@/utils/apiUrl";

interface Question {
  _id: string;
  title: string;
  content: string;
  category: string;
  location: string;
  createdAt: string;
}

export default function LawyerQATab() {
  const { lawyerSession } = useAuthStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answerContent, setAnswerContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const SERVER_URL = getServerUrl();
      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/qa/questions/unanswered`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (error) {
      toast.error("Failed to fetch open questions.");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (questionId: string) => {
    if (!answerContent || answerContent.length < 40) {
      toast.error("Answer must be at least 40 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const SERVER_URL = getServerUrl();
      const res = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/qa/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          lawyerId: lawyerSession.user?._id || "lwy-001",
          content: answerContent
        })
      });

      if (res.ok) {
        toast.success("Answer posted successfully!");
        setQuestions(questions.filter(q => q._id !== questionId));
        setActiveQuestionId(null);
        setAnswerContent("");
      } else {
        toast.error("Failed to post answer.");
      }
    } catch (error) {
      toast.error("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 lg:p-16 max-w-5xl mx-auto w-full">
      <div className="mb-12">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Q&A Engine</h2>
        <p className="text-sm text-neutral-500">
          Answer open questions to build your public reputation and attract new clients.
        </p>
      </div>

      {questions.length === 0 ? (
        <div className="bg-neutral-50 border border-neutral-200 p-12 text-center flex flex-col items-center">
          <CheckCircle className="w-12 h-12 text-neutral-300 mb-4" />
          <h3 className="text-lg font-bold text-neutral-700">All caught up!</h3>
          <p className="text-sm text-neutral-500 mt-2">There are no unanswered questions in the directory right now.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((q) => (
            <div key={q._id} className="border border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-neutral-100 px-2 py-1 mr-2">{q.category}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{q.location}</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-medium">
                  {new Date(q.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <h3 className="text-xl font-bold mb-3">{q.title}</h3>
              <p className="text-sm text-neutral-600 mb-6 leading-relaxed line-clamp-3">{q.content}</p>

              {activeQuestionId === q._id ? (
                <div className="mt-6 border-t border-neutral-200 pt-6 animate-in slide-in-from-top-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Your Answer</label>
                  <textarea 
                    value={answerContent}
                    onChange={(e) => setAnswerContent(e.target.value)}
                    rows={5}
                    placeholder="Provide a professional, clear legal answer. This will be publicly visible on your profile..."
                    className="w-full border border-black p-4 text-sm focus:outline-none focus:ring-1 focus:ring-black mb-4 resize-none"
                  />
                  <div className="flex gap-4 justify-end">
                    <button 
                      onClick={() => { setActiveQuestionId(null); setAnswerContent(""); }}
                      className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => submitAnswer(q._id)}
                      disabled={submitting}
                      className="bg-black text-white px-8 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-neutral-800 transition-colors"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MessageSquare className="w-4 h-4" /> Publish Answer</>}
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setActiveQuestionId(q._id)}
                  className="bg-black text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                  Draft Answer
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
