import { FormEvent, useState } from "react";

export type AuthMode = "login" | "register";

export type AuthFormInput = {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
};

type AuthFormProps = {
  isSubmitting: boolean;
  onSubmit: (input: AuthFormInput) => Promise<void>;
};

export function AuthForm({ isSubmitting, onSubmit }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) {
      return;
    }

    await onSubmit({
      mode,
      name: name.trim(),
      email: email.trim(),
      password,
    });
  }

  return (
    <section className="panel auth-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow mono">Private space</p>
          <h2>{mode === "login" ? "Sign In" : "Create Account"}</h2>
        </div>
      </div>

      <form className="activity-form auth-form" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <label>
            Name
            <input
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Demo User"
              required
              value={name}
            />
          </label>
        ) : null}

        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="demo@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label>
          Password
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        <button disabled={isSubmitting} type="submit">
          {isSubmitting
            ? "Please wait..."
            : mode === "login"
              ? "Sign In"
              : "Create Account"}
        </button>
      </form>

      <button
        className="text-button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        type="button"
      >
        {mode === "login"
          ? "No account? Register"
          : "Already have an account? Sign in"}
      </button>
    </section>
  );
}
