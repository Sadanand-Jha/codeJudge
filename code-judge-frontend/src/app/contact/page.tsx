import Link from "next/link";

export const metadata = {
  title: "Contact",
  description: "Contact QuizSupport — get help with online quizzes and practice tests.",
  alternates: { canonical: "https://www.quizsupport.com/contact" },
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Contact QuizSupport</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Need help joining a quiz, tracking your scores, or creating quizzes for
        your classroom? Reach out to us and we will get back to you.
      </p>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        Email us at{" "}
        <a href="mailto:support@quizsupport.com" className="underline underline-offset-4">
          support@quizsupport.com
        </a>
        .
      </p>
      <Link href="/" className="mt-8 inline-block text-sm underline underline-offset-4">
        Back to Home
      </Link>
    </main>
  );
}
