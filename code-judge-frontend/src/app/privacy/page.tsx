import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "Read the QuizSupport privacy policy — how quiz scores and account data are handled.",
  alternates: { canonical: "https://www.quizsupport.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        QuizSupport is an online quiz platform. We store your account details,
        quiz attempts and scores so you can track your progress and see instant
        results across devices.
      </p>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        We do not sell your personal data. Quiz creators can see the attempts
        and scores of participants in their own quizzes. For questions about
        your data, contact support@quizsupport.com.
      </p>
      <Link href="/" className="mt-8 inline-block text-sm underline underline-offset-4">
        Back to Home
      </Link>
    </main>
  );
}
