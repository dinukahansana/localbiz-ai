import { Link, useOutletContext } from 'react-router';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Megaphone,
  Package,
  Plus,
  Sparkles,
  Store,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StoreIllustration from '../components/StoreIllustration.jsx';
import LoadState from '../components/LoadState.jsx';

const stats = [
  {
    label: 'Products',
    icon: Package,
    note: 'Your catalog starts here',
    to: '/dashboard/products',
    color: 'bg-[#eef2e9] text-sage',
  },
  {
    label: 'Campaigns',
    icon: Megaphone,
    note: 'Your saved campaign drafts',
    to: '/dashboard/campaigns',
    color: 'bg-[#f8eee4] text-[#ae7950]',
  },
  {
    label: 'Scheduled posts',
    icon: CalendarDays,
    note: 'A little planning goes a long way',
    to: '/dashboard/calendar',
    color: 'bg-[#eceef8] text-[#747aa4]',
  },
];

const steps = [
  {
    number: '01',
    icon: Store,
    title: 'Make yourself at home',
    description: 'Save your business name, category, and story.',
    to: '/dashboard/profile',
  },
  {
    number: '02',
    icon: Package,
    title: 'Give your products a place',
    description: 'Add your products, prices, and details.',
    to: '/dashboard/products',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Create your first campaign',
    description: 'Generate three post ideas, then make them yours.',
    to: '/dashboard/campaigns/new',
  },
];

export default function DashboardPage() {
  const { products, campaigns } = useOutletContext();
  const campaignList = campaigns.data?.campaigns || [];
  return (
    <>
      <PageHeader
        eyebrow="A FRESH START"
        title="Welcome to your workspace"
        description="Good things start small. Let’s make room for your next big idea."
      >
        <Link className="button-primary shrink-0" to="/dashboard/campaigns/new">
          <Plus size={16} />
          New campaign
        </Link>
      </PageHeader>

      <section className="relative mb-7 grid overflow-hidden rounded-2xl bg-forest text-white md:grid-cols-[1.15fr_1fr]">
        <div className="relative z-10 p-7 sm:p-9">
          <p className="mb-4 flex items-center gap-2 text-[10px] font-medium tracking-[.18em] text-lime">
            <span className="h-px w-5 bg-lime" />
            MADE FOR YOUR KIND OF BUSINESS
          </p>
          <h2 className="display-heading text-[39px] leading-[1.08] sm:text-[44px]">
            Small business.
            <br />
            <span className="text-lime">Big possibilities.</span>
          </h2>
          <p className="mt-4 max-w-[310px] text-sm leading-6 text-[#c4d4cc]">
            Your products, your stories, your next chapter.
            <br className="hidden sm:block" /> A little inspiration. All in one place.
          </p>
          <Link
            to="/dashboard/products"
            className="mt-6 inline-flex items-center gap-2 border-b border-white/30 pb-1 text-xs font-medium text-white hover:text-lime"
          >
            Explore your workspace
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <StoreIllustration />
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, icon: Icon, note, to, color }) => (
          <Link
            key={label}
            to={to}
            className="panel group p-5 transition-colors hover:border-sage/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">{label}</span>
              <span className={`grid size-9 place-items-center rounded-xl ${color}`}>
                <Icon size={18} strokeWidth={1.6} />
              </span>
            </div>
            <p className="mt-2 text-[32px] font-medium leading-none tracking-tight">
              {label === 'Products'
                ? (products.data?.total ?? '—')
                : label === 'Campaigns'
                  ? (campaigns.data?.total ?? '—')
                  : '—'}
            </p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted">
                {label === 'Products'
                  ? products.loading
                    ? 'Loading catalog…'
                    : products.error
                      ? 'Catalog unavailable'
                      : note
                  : label === 'Campaigns'
                    ? campaigns.loading
                      ? 'Loading drafts…'
                      : campaigns.error
                        ? 'Campaigns unavailable'
                        : note
                    : 'Coming soon'}
              </p>
              <ArrowUpRight className="text-stone-400 group-hover:text-sage" size={14} />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.05fr_1fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-line p-5">
            <div>
              <h2 className="text-base font-semibold">Find your feet</h2>
              <p className="mt-1 text-xs text-muted">A quick tour of your new workspace.</p>
            </div>
            <span className="rounded-full bg-canvas px-2.5 py-1 text-[10px] font-medium text-muted">
              START HERE
            </span>
          </div>
          <div className="px-5">
            {steps.map(({ number, icon: Icon, title, description, to }) => (
              <Link
                key={number}
                to={to}
                className="group flex items-center gap-3 border-b border-line py-5 last:border-0"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas text-sage">
                  <Icon size={19} strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium group-hover:text-sage">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
                </div>
                <ArrowRight size={16} className="text-stone-400 group-hover:text-sage" />
              </Link>
            ))}
          </div>
        </section>
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-5">
            <h2 className="text-base font-semibold">Your campaigns</h2>
            <Link to="/dashboard/campaigns" className="text-xs text-muted hover:text-forest">
              View all <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <LoadState resource={campaigns} label="campaigns" />
          {campaigns.data &&
            (campaignList.length ? (
              <div className="divide-y divide-line px-5">
                {campaignList.slice(0, 3).map((campaign) => (
                  <Link
                    key={campaign.id}
                    to={`/dashboard/campaigns/${campaign.id}`}
                    className="flex items-center justify-between gap-3 py-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{campaign.title}</p>
                      <p className="mt-1 truncate text-xs text-muted">
                        {campaign.productName} · 3 post ideas · Draft
                      </p>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-sage" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Megaphone}
                title="Your next story belongs here"
                description="There are no campaigns yet. Turn a product into three post ideas and save your first draft."
                to="/dashboard/campaigns/new"
                linkLabel="Create a campaign"
              />
            ))}
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-[#c9d5c3] bg-[#f0f4eb]/70 px-5 py-4 text-xs">
        <span className="grid size-7 place-items-center rounded-full bg-white text-sage">
          <Check size={15} />
        </span>
        <p className="flex-1 leading-5 text-muted">
          <strong className="font-semibold text-forest">Your business, taking shape.</strong> Save
          your profile, build your catalog, and create a campaign that sounds like you.
        </p>
        <span className="text-[10px] font-semibold tracking-wider text-sage">YOUR WORKSPACE</span>
      </div>
    </>
  );
}
