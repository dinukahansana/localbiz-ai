import { Link } from 'react-router';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Heart,
  Megaphone,
  Package,
  Sparkles,
} from 'lucide-react';
import Brand from '../components/Brand.jsx';
import StoreIllustration from '../components/StoreIllustration.jsx';

const features = [
  {
    number: '01',
    icon: Package,
    title: 'Start with what you love.',
    text: 'A home for your products, from the everyday essentials to the local favorites.',
  },
  {
    number: '02',
    icon: Megaphone,
    title: 'Give your story a voice.',
    text: 'A space for campaign ideas that will help your business show up as itself.',
  },
  {
    number: '03',
    icon: CalendarDays,
    title: 'Make room for what’s next.',
    text: 'A clear view of your content calendar, ready for the next chapter of your business.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="border-b border-line bg-white">
        <nav
          aria-label="Public navigation"
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8"
        >
          <Brand />
          <div className="flex items-center gap-5">
            <Link
              className="hidden text-sm font-medium text-muted hover:text-forest sm:block"
              to="/login"
            >
              Log in
            </Link>
            <Link className="button-primary !px-4 !text-xs" to="/register">
              Get started
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </nav>
      </header>
      <main id="main-content">
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <div>
            <span className="badge mb-7">
              <Sparkles size={12} />A fresh start for local business
            </span>
            <h1 className="display-heading text-[54px] leading-[1.02] tracking-tight text-forest sm:text-7xl">
              Small business.
              <br />
              Big <span className="italic text-sage">possibilities.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted">
              You bring the passion. We’re building a little space for your products, your stories,
              and everything your business can become.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/dashboard" className="button-primary">
                Explore the workspace
                <ArrowRight size={16} />
              </Link>
              <a className="text-sm font-medium text-forest hover:underline" href="#possibilities">
                Take a look around
              </a>
            </div>
            <p className="mt-5 text-xs text-muted">
              Your own business workspace · Create an account to start
            </p>
          </div>
          <div className="landing-illustration relative overflow-hidden rounded-[28px] bg-forest">
            <div className="absolute left-7 top-7 flex items-center gap-2 text-[10px] tracking-[.15em] text-lime">
              <span className="size-1.5 rounded-full bg-lime" />
              GOOD THINGS GROW HERE
            </div>
            <StoreIllustration />
            <div className="absolute bottom-7 left-7 right-7 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-[#c4d4cc]">
              <span>Made for the neighborhood.</span>
              <Heart size={17} strokeWidth={1.5} />
            </div>
          </div>
        </section>
        <section id="possibilities" className="border-y border-line bg-white">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-3">A LITTLE LESS OVERWHELM. A LITTLE MORE POSSIBILITY.</p>
                <h2 className="display-heading text-3xl text-forest sm:text-4xl">
                  Your next chapter starts here.
                </h2>
              </div>
              <span className="text-xs text-muted">The vision, one phase at a time.</span>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {features.map(({ number, icon: Icon, title, text }) => (
                <article key={number} className="border-t border-line pt-6">
                  <div className="mb-5 flex items-center justify-between">
                    <Icon size={23} strokeWidth={1.5} className="text-sage" />
                    <span className="text-[11px] text-stone-400">/{number}</span>
                  </div>
                  <h3 className="mb-3 text-base font-semibold">{title}</h3>
                  <p className="max-w-xs text-sm leading-6 text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-xs text-muted sm:px-8">
        <span>LocalBiz AI · NextStack Studio</span>
        <span>Built for LovHack Season 3 · NextStack Studio</span>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-forest">
          Make yourself at home
          <ArrowUpRight size={13} />
        </Link>
      </footer>
    </div>
  );
}
