import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Brand from '../components/Brand.jsx';
import FormField from '../components/FormField.jsx';
import { useAuth } from '../auth/AuthContext.js';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const destination =
    typeof location.state?.from === 'string' && /^\/dashboard(?:\/|$)/.test(location.state.from)
      ? location.state.from
      : '/dashboard';
  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFields((current) => ({
      ...current,
      [name]: '',
      ...(name === 'password' ? { confirmPassword: '' } : {}),
    }));
  }
  async function submit(event) {
    event.preventDefault();
    setError('');
    setFields({});
    if (!isLogin && form.password !== form.confirmPassword) {
      setFields({ confirmPassword: 'Passwords must match.' });
      return;
    }
    setBusy(true);
    try {
      await auth.authenticate(mode, {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      navigate(destination, { replace: true });
    } catch (failure) {
      setError(failure.message);
      setFields(failure.fields || {});
    } finally {
      setBusy(false);
    }
  }
  if (auth.user) return <Navigate to={destination} replace />;
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-forest p-12 text-white lg:flex">
        <Brand light />
        <div className="relative z-10 my-14 max-w-md">
          <Sparkles className="mb-8 text-lime" size={38} strokeWidth={1.2} />
          <h2 className="display-heading text-6xl leading-[1.07]">
            Every big story
            <br />
            starts <span className="text-lime">local.</span>
          </h2>
          <p className="mt-6 max-w-sm text-base leading-7 text-[#c4d4cc]">
            For the makers, the shopkeepers, the neighborhood favorites. There’s a little space for
            you here.
          </p>
        </div>
        <p className="text-xs text-[#c4d4cc]">LocalBiz AI · Made for your kind of business</p>
        <div className="pointer-events-none absolute -bottom-40 -right-52 size-[550px] rounded-full border-[70px] border-white/[.03]" />
      </aside>
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="mb-8 lg:hidden">
          <Brand />
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-muted hover:text-forest"
        >
          <ArrowLeft size={14} />
          Back home
        </Link>
        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <p className="eyebrow mb-3">YOUR NEXT CHAPTER</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {isLogin ? 'Welcome back.' : 'Make yourself at home.'}
          </h1>
          <p className="mb-7 mt-3 text-sm leading-6 text-muted">
            {isLogin
              ? 'Log in to your business workspace.'
              : 'Create your account and give your business a place to grow.'}
          </p>
          {auth.loading ? (
            <p role="status" className="text-sm text-muted">
              Checking your session…
            </p>
          ) : (
            <form onSubmit={submit}>
              <fieldset disabled={busy} className="space-y-5">
                <legend className="sr-only">{isLogin ? 'Log in' : 'Create account'}</legend>
                {!isLogin && (
                  <FormField
                    name="name"
                    label="Your name"
                    value={form.name}
                    onChange={change}
                    error={fields.name}
                    required
                    maxLength={100}
                    autoComplete="name"
                  />
                )}
                <FormField
                  name="email"
                  label="Email address"
                  value={form.email}
                  onChange={change}
                  error={fields.email}
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="username"
                />
                <FormField
                  name="password"
                  label="Password"
                  value={form.password}
                  onChange={change}
                  error={fields.password}
                  type="password"
                  required
                  minLength={isLogin ? undefined : 15}
                  maxLength={128}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                {!isLogin && (
                  <>
                    <p className="text-xs leading-5 text-muted">
                      Use 15–128 characters. A phrase with several words is easy to remember.
                    </p>
                    <FormField
                      name="confirmPassword"
                      label="Confirm password"
                      value={form.confirmPassword}
                      onChange={change}
                      error={fields.confirmPassword}
                      type="password"
                      required
                      maxLength={128}
                      autoComplete="new-password"
                    />
                  </>
                )}
                {(error || auth.error) && (
                  <p role="alert" className="text-sm text-red-700">
                    {error || auth.error}
                  </p>
                )}
                <button type="submit" className="button-primary w-full">
                  {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
                </button>
              </fieldset>
            </form>
          )}
          <p className="mt-6 text-center text-xs text-muted">
            {isLogin ? 'New around here?' : 'Already have an account?'}{' '}
            <Link
              to={isLogin ? '/register' : '/login'}
              state={{ from: destination }}
              className="font-semibold text-forest hover:underline"
            >
              {isLogin ? 'Create an account' : 'Log in'}
            </Link>
          </p>
        </div>
        <p className="text-center text-[11px] text-muted">
          LovHack Season 3 · Your business workspace
        </p>
      </main>
    </div>
  );
}
