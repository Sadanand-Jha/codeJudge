"use client";

import { useState, useEffect, useMemo, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Clock,
  Users,
  Check,
  X,
  Shield,
  Timer,
  RefreshCw,
  Shuffle,
  Award,
  MessageSquare,
  Bookmark,
  Trophy,
  FileText,
  Target,
  Eye,
  SkipForward,
  Lightbulb,
  Calendar,
  Star,
  Hash,
  Tag,
  Globe,
  Lock,
  GraduationCap,
  Code2,
  Type,
  AlignLeft,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  ArrowLeft,
  Play,
  UserCheck,
  School,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getQuizById, registerForQuiz, type Quiz, getQuizCode, quizCodePath } from "@/services/quiz";
import { DEFAULT_ASSESSMENT_SETTINGS, LifelineConfig } from "@/types/quiz";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/authStore";
import { useQuizRegistrationStore } from "@/store/quizRegistrationStore";
import { loadQuizAudience } from "@/utils/quizStorage";
import { useRoomStore, isUserEligible } from "@/store/roomStore";

export default function QuizRegisterPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const { isRegistered, getRegistration, register, unregister } = useQuizRegistrationStore();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUnregisterModal, setShowUnregisterModal] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [readRules, setReadRules] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [rollNo, setRollNo] = useState("");

  const quizCode = getQuizCode(quizId);
  const settings = DEFAULT_ASSESSMENT_SETTINGS;

  const registration = getRegistration(quizCode);
  const registered = isRegistered(quizCode);

  // Audience-based eligibility. The frontend only surfaces a hint — the real
  // check happens on the registration endpoint. When no audience is stored the
  // quiz is treated as open to everyone.
  const audience = useMemo(() => loadQuizAudience(quizCode), [quizCode]);
  const rooms = useRoomStore((s) => s.rooms);
  const hydrateRooms = useRoomStore((s) => s.hydrate);
  useEffect(() => {
    hydrateRooms();
  }, [hydrateRooms]);

  const eligible = useMemo(() => {
    if (!audience || audience.mode === "EVERYONE") return true;
    if (audience.mode === "ROOMS" && audience.roomIds.length === 0) return true;
    return isUserEligible(rooms, audience.roomIds, {
      email: user?.email,
      name: user?.displayName || user?.username || [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    }, audience.students ?? []);
  }, [audience, rooms, user]);

  const canRegister = agreed && readRules && studentName.trim() && rollNo.trim();

  useEffect(() => {
    async function fetchQuiz() {
      try {
        const data = await getQuizById(quizCode);
        setQuiz(data);
      } catch (err) {
        console.error("Failed to fetch quiz:", err);
        toast.error({
          title: "Failed to Load Quiz",
          description: "Please try again later.",
        });
      } finally {
        setLoading(false);
      }
    }
    if (quizCode) fetchQuiz();
  }, [quizCode]);

  const handleRegisterClick = () => {
    if (!studentName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!rollNo.trim()) {
      toast.error("Please enter your roll number");
      return;
    }
    if (!readRules) {
      toast.error("Please confirm that you have read all instructions");
      return;
    }
    if (!agreed) {
      toast.error("Please agree to the assessment rules");
      return;
    }

    // mock registration
    register(quizCode, quizCode, quiz?.name || "Quiz", studentName.trim(), rollNo.trim());
    toast.success({
      title: "Registered Successfully!",
      description: "You have successfully registered for the quiz.",
    });
    router.push(quizCodePath(quizCode, "waiting"));
  };

  const handleUnregisterClick = () => {
    setShowUnregisterModal(true);
  };

  const confirmUnregister = () => {
    unregister(quizCode);
    setShowUnregisterModal(false);
    toast.success({
      title: "Unregistered",
      description: "You have been removed from the quiz.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D14]">
        <div className="flex">
          <div className="hidden lg:block w-64 border-r border-border bg-[#0F1117] p-4">
            <div className="h-8 w-32 bg-white/[0.06] animate-pulse rounded-lg mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-white/[0.06] animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
          <div className="flex-1 p-6 sm:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="h-10 w-64 bg-white/[0.06] animate-pulse rounded-lg mb-6" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-48 bg-white/[0.06] animate-pulse rounded-2xl" />
                  ))}
                </div>
                <div className="h-96 bg-white/[0.06] animate-pulse rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-[#0B0D14] p-6">
        <div className="max-w-4xl mx-auto text-center py-16">
          <p className="text-sm text-muted-foreground">Quiz not found.</p>
          <Link href="/quiz" className="text-foreground text-sm mt-2 inline-block">← Back to Quizzes</Link>
        </div>
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="min-h-screen bg-[#0B0D14]">
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 ring-1 ring-inset ring-danger/25">
            <Lock className="h-8 w-8 text-danger" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
            Registration Restricted
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This quiz is available only to students belonging to the selected rooms.
          </p>
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/[0.06] px-4 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
            <p className="text-xs text-[#D1D5DB]">
              You are not part of an eligible room for &quot;{quiz.name}&quot;.
            </p>
          </div>
          <Link
            href={quizCodePath(quizCode)}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-border-hover bg-white/[0.03] px-6 text-sm font-semibold text-white transition-colors hover:bg-white/[0.06]"
          >
            Back to Quiz
          </Link>
        </div>
      </div>
    );
  }

  const enabledLifelines = settings.lifelines.filter((l) => l.enabled && l.maxUses > 0);
  const questionTypes = [
    { label: "MCQ", count: 20, icon: CircleDot, color: "#3B82F6" },
    { label: "Multiple Correct", count: 5, icon: Check, color: "#22C55E" },
    { label: "True / False", count: 5, icon: ToggleRight, color: "#F59E0B" },
    { label: "Short Answer", count: 0, icon: Type, color: "#EC4899" },
    { label: "Long Answer", count: 0, icon: AlignLeft, color: "#F97316" },
    { label: "Coding", count: 0, icon: Code2, color: "#06B6D4" },
  ];

  const totalQuestions = questionTypes.reduce((sum, q) => sum + q.count, 0);
  const totalMarks = 100;
  const passingMarks = 40;
  const quizDuration = "60 min";
  const estimatedTime = "75 min";

  const getStatusBadge = () => {
    const now = new Date();
    const start = quiz.starttime ? new Date(quiz.starttime) : null;
    const end = quiz.endtime ? new Date(quiz.endtime) : null;

    if (!start || now < start) {
      return { text: "Scheduled", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", icon: Calendar };
    }
    if (end && now > end) {
      return { text: "Closed", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle };
    }
    return { text: "Live", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 };
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  return (
    <div className="min-h-screen bg-[#0B0D14]">
      <div className="flex">
        {/* Sidebar - hidden on mobile, visible on lg+ */}
        <div className="hidden lg:block w-64 border-r border-border bg-[#0F1117] shrink-0">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white">Quiz</span>
            </div>
            <nav className="space-y-1">
              <NavItem icon={BookOpen} label="Overview" href={`/quiz/${quizCode}`} />
              <NavItem icon={Users} label="Participants" href={`/quiz/${quizCode}/participants`} />
              <NavItem icon={Trophy} label="Leaderboard" href={`/quiz/${quizCode}/leaderboard`} />
              <NavItem icon={BarChart3} label="Analytics" href={`/quiz/${quizCode}/analytics`} />
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="sticky top-0 z-10 border-b border-border bg-[#0B0D14]/80 backdrop-blur-xl">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={quizCodePath(quizCode)}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors mb-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Quiz
                  </Link>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {registered ? "Registration Confirmed" : "Register for Quiz"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {registered
                      ? `You are registered as ${registration?.studentName} (${registration?.rollNumber})`
                      : "Review the quiz details before starting your attempt."}
                  </p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusBadge.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{statusBadge.text}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - 70% */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Quiz Overview Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-border-hover bg-card p-6 sm:p-8"
                  >
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center shrink-0">
                        <BookOpen className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{quiz.name}</h2>
                        <p className="text-sm text-muted-foreground">by {quiz.creator_name || "Unknown Creator"}</p>
                      </div>
                    </div>

                    <p className="text-sm text-[#D1D5DB] mb-6 leading-relaxed">
                      Test your knowledge and skills with this comprehensive assessment.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InfoItem icon={Hash} label="Quiz Code" value={quiz.code} mono />
                      <InfoItem icon={GraduationCap} label="Subject" value="Computer Science" />
                      <InfoItem icon={Target} label="Topic" value="Data Structures & Algorithms" />
                      <InfoItem icon={Star} label="Difficulty" value="Medium" />
                      <InfoItem icon={Calendar} label="Created On" value={new Date(quiz.created_at || Date.now()).toLocaleDateString()} />
                      <InfoItem icon={Clock} label="Start Time" value={quiz.starttime ? new Date(quiz.starttime).toLocaleString() : "TBD"} />
                      <InfoItem icon={Clock} label="End Time" value={quiz.endtime ? new Date(quiz.endtime).toLocaleString() : "TBD"} />
                      <InfoItem icon={Timer} label="Duration" value={quizDuration} />
                      <InfoItem icon={Globe} label="Visibility" value="Public" />
                      <InfoItem icon={Lock} label="Language" value="English" />
                      <div className="sm:col-span-2">
                        <InfoItem icon={Tag} label="Tags" value={["DSA", "Algorithms", "Interview Prep"].join(", ")} />
                      </div>
                    </div>
                  </motion.div>

                  {/* Instructions Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-border-hover bg-card p-6 sm:p-8"
                  >
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Info className="w-5 h-5 text-foreground" />
                      Important Instructions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InstructionItem icon={BookOpen} text="Read every question carefully before answering." />
                      <InstructionItem icon={Timer} text="The timer cannot be paused once started." />
                      <InstructionItem icon={RefreshCw} text="Do not refresh the page during the quiz." />
                      <InstructionItem icon={Shield} text="Answers are auto-saved every 30 seconds." />
                      <InstructionItem icon={Eye} text="Leaderboard visibility depends on quiz settings." />
                      <InstructionItem icon={X} text="Once submitted, the attempt cannot be edited." />
                    </div>
                  </motion.div>

                  {/* Question Distribution */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl border border-border-hover bg-card p-6 sm:p-8"
                  >
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Layers3 className="w-5 h-5 text-foreground" />
                      Question Distribution
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {questionTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <div
                            key={type.label}
                            className="rounded-xl border border-border-hover bg-[#0F1117] p-4 hover:border-white/[0.15] transition-colors"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${type.color}15`, border: `1px solid ${type.color}25` }}
                              >
                                <Icon className="w-5 h-5" style={{ color: type.color }} />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{type.label}</p>
                                <p className="text-lg font-bold text-white">{type.count}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Marks & Timing */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-2xl border border-border-hover bg-card p-6 sm:p-8"
                  >
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5 text-foreground" />
                      Marks & Timing
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <MetricCard label="Total Marks" value={totalMarks.toString()} icon={Target} color="#EC4899" />
                      <MetricCard label="Passing Marks" value={passingMarks.toString()} icon={CheckCircle2} color="#22C55E" />
                      <MetricCard label="Negative Marking" value={settings.negativeMarking ? `Yes (-${settings.negativeMarkValue})` : "No"} icon={XCircle} color={settings.negativeMarking ? "#EF4444" : "#22C55E"} />
                      <MetricCard label="Duration" value={quizDuration} icon={Clock} color="#F59E0B" />
                      <MetricCard label="Est. Completion" value={estimatedTime} icon={Timer} color="#8B5CF6" />
                    </div>
                  </motion.div>
                </div>

                {/* Right Column - 30% */}
                <div className="lg:col-span-1">
                  <div className="lg:sticky lg:top-24 space-y-6">
                    {audience && audience.mode === "ROOMS" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3.5"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <div>
                          <p className="text-xs font-semibold text-emerald-400">
                            You are eligible for this quiz
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#D1D5DB]">
                            You belong to one of the rooms selected by the quiz creator.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Student Info Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="rounded-2xl border border-border-hover bg-card p-6"
                    >
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-foreground" />
                        Student Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-white font-bold text-lg">
                            {user?.username?.charAt(0) || "S"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user?.username || "Student"}</p>
                            <p className="text-xs text-muted-foreground">@{user?.email || "student"}</p>
                          </div>
                        </div>
                        {registered ? (
                          <div className="space-y-2 text-sm">
                            <p className="font-semibold text-white">{registration?.studentName}</p>
                            <p className="text-muted-foreground">{registration?.rollNumber}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <InputField label="Full Name" value={studentName} onChange={setStudentName} placeholder="Enter your name" />
                            <InputField label="Roll Number" value={rollNo} onChange={setRollNo} placeholder="Enter roll number" />
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Quiz Details Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="rounded-2xl border border-border-hover bg-card p-6"
                    >
                      <h3 className="text-sm font-bold text-white mb-4">Quiz Details</h3>
                      <div className="space-y-2.5">
                        <DetailRow label="Quiz Code" value={quiz.code} />
                        <DetailRow label="Duration" value={quizDuration} />
                        <DetailRow label="Questions" value={totalQuestions.toString()} />
                        <DetailRow label="Total Marks" value={totalMarks.toString()} />
                        <DetailRow label="Visibility" value="Public" />
                        <DetailRow label="Leaderboard" value="Enabled" />
                      </div>
                    </motion.div>

                    {/* Eligibility Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="rounded-2xl border border-border-hover bg-card p-6"
                    >
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-foreground" />
                        Eligibility Status
                      </h3>
                      <div className="space-y-2">
                        <EligibilityItem status="eligible" text="Eligible to participate" />
                        <EligibilityItem status="info" text={registered ? "Already registered" : "Not previously registered"} />
                        <EligibilityItem status="success" text="Quiz is currently active" />
                      </div>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-3"
                    >
                      {registered ? (
                        <button
                          onClick={handleUnregisterClick}
                          className="w-full h-14 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-sm font-bold text-white hover:shadow-[0_0_24px_rgba(34,197,94,0.3)] transition-all flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Registered
                        </button>
                      ) : (
                        <button
                          onClick={handleRegisterClick}
                          disabled={!canRegister}
                          className="w-full h-14 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-sm font-bold text-white hover:shadow-[0_0_24px_rgba(124,58,237,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Register & Continue
                        </button>
                      )}
                      <Link
                        href={quizCodePath(quizCode)}
                        className="block w-full h-12 rounded-xl border border-border-hover bg-white/[0.03] text-sm font-semibold text-white hover:border-white/[0.16] hover:bg-white/[0.06] transition-all text-center"
                      >
                        Back to Quiz
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unregister Confirmation Modal */}
      <AnimatePresence>
        {showUnregisterModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUnregisterModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-3xl border border-border-hover bg-card p-6 sm:p-8 shadow-2xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center">
                  <X className="w-8 h-8 text-[#F59E0B]" />
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-2">Unregister from Quiz?</h3>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  This will remove you from the registered participants list for "{quiz.name}".
                  You can register again later if the quiz is still open.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowUnregisterModal(false)}
                    className="flex-1 h-12 rounded-xl border border-border-hover bg-white/[0.03] text-sm font-semibold text-white hover:border-white/[0.16] hover:bg-white/[0.06] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmUnregister}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-sm font-bold text-white hover:shadow-[0_0_24px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Unregister
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon: Icon, label, href }: { icon: any; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors"
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

function InfoItem({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-hover bg-[#0F1117] p-3">
      <Icon className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`text-sm text-white ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function InstructionItem({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-hover bg-[#0F1117] p-3">
      <div className="w-8 h-8 rounded-lg bg-[#C7DDEC]/10 border border-[#C7DDEC]/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-foreground" />
      </div>
      <p className="text-xs text-[#D1D5DB] leading-relaxed">{text}</p>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="rounded-xl border border-border-hover bg-[#0F1117] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border-hover bg-[#0F1117] p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-border-hover bg-[#0F1117] text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#C7DDEC]/50 focus:ring-2 focus:ring-[#C7DDEC]/10 transition-all"
      />
    </div>
  );
}

function EligibilityItem({ status, text }: { status: "eligible" | "info" | "success" | "warning" | "error"; text: string }) {
  const configs = {
    eligible: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    info: { icon: Info, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
    success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    warning: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    error: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 rounded-xl border ${config.border} ${config.bg} p-2.5`}>
      <Icon className={`w-4 h-4 ${config.color} shrink-0`} />
      <span className="text-xs text-[#D1D5DB]">{text}</span>
    </div>
  );
}

function Layers3({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function CircleDot({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ToggleRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}