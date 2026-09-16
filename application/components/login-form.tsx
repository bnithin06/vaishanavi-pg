"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      // ------------------------------------------
      // 1. Authenticate with Supabase
      // ------------------------------------------

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw loginError;
      }

      // ------------------------------------------
      // 2. Send user to server-side role router
      // ------------------------------------------

      router.push("/dashboard");

      // Make Server Components aware of the
      // newly established authentication session.
      router.refresh();
    } catch (error: unknown) {
      console.error("Login failed:", error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(
          "Unable to login. Please check your credentials."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        className
      )}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Login
          </CardTitle>

          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">

              {/* Email */}
              <div className="grid gap-2">
                <Label htmlFor="email">
                  Email
                </Label>

                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">
                    Password
                  </Label>

                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  disabled={isLoading}
                />
              </div>

              {/* Error */}
              {error && (
                <p
                  role="alert"
                  className="text-sm text-red-500"
                >
                  {error}
                </p>
              )}

              {/* Login button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading
                  ? "Logging in..."
                  : "Login"}
              </Button>
            </div>

            {/* Sign up */}
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}