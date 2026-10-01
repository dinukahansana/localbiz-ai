import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import Brand from '../components/Brand.jsx';
import PhaseNotice from '../components/PhaseNotice.jsx';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';

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
              ? 'Your business, your stories, your space.'
              : 'A new space for a business like yours.'}
          </p>
          <PhaseNotice>
            Accounts are coming in a future phase. Explore the workspace without signing in.
          </PhaseNotice>
          <fieldset disabled className="mt-7 space-y-5">
            <legend className="sr-only">
              {isLogin ? 'Login' : 'Registration'} preview — not active
            </legend>
            {!isLogin && (
              <label className="field-label" htmlFor="auth-name">
                Your name
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  className="field mt-2"
                  placeholder="Your name"
                />
              </label>
            )}
            <label className="field-label" htmlFor="auth-email">
              Email address
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                className="field mt-2"
                placeholder="you@yourbusiness.com"
              />
            </label>
            <label className="field-label" htmlFor="auth-password">
              Password
              <input
                id="auth-password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="field mt-2"
                placeholder="Available in a future phase"
              />
            </label>
            <button className="button-primary w-full">
              {isLogin ? 'Log in' : 'Create account'} · Coming soon
            </button>
          </fieldset>
          <Link to="/dashboard" className="button-secondary mt-3 w-full">
            Explore the preview
            <ArrowRight size={16} />
          </Link>
          <p className="mt-6 text-center text-xs text-muted">
            {isLogin ? 'New around here?' : 'Already have an account?'}{' '}
            <Link
              to={isLogin ? '/register' : '/login'}
              className="font-semibold text-forest hover:underline"
            >
              {isLogin ? 'Registration preview' : 'Login preview'}
            </Link>
          </p>
        </div>
        <p className="text-center text-[11px] text-muted">
          LovHack Season 3 · Authentication coming soon
        </p>
      </main>
    </div>
  );
}
