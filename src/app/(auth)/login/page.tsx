import { AuthForm } from "@/components/auth-form";
import { signIn } from "@/app/actions";

export default function LoginPage() {
  return <AuthForm mode="login" action={signIn} />;
}
