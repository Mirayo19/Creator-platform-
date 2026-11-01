import { AuthForm } from "@/components/auth-form";
import { signUp } from "@/app/actions";

export default function SignupPage() {
  return <AuthForm mode="signup" action={signUp} />;
}
