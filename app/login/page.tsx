import { LoginPageClient } from "./login-page-client";

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo =
    params.redirectTo?.startsWith("/dashboard") ? params.redirectTo : undefined;

  return <LoginPageClient redirectTo={redirectTo} />;
}
