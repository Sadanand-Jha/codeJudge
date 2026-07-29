import RegistrationForm from "@/components/forms/RegistrationForm";
import AuthGuard from "@/components/guards/AuthGuard";

export default function RegisterPage() {
  return (
    <AuthGuard>
      <RegistrationForm />
    </AuthGuard>
  );
}
