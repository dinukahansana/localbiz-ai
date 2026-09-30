import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, Image, Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import PhaseNotice from '../components/PhaseNotice.jsx';

export default function NewCampaignPage() {
  return (
    <>
      <Link
        to="/dashboard/campaigns"
        className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-forest"
      >
        <ArrowLeft size={14} />
        All campaigns
      </Link>
      <PageHeader
        eyebrow="FROM LITTLE IDEA TO BIG HELLO"
        title="Let’s tell your story"
        description="A preview of your future campaign studio."
      />
      <PhaseNotice>
        This builder is a layout preview. AI generation and campaign saving are not available yet.
      </PhaseNotice>
      <div className="my-7 flex flex-wrap items-center gap-3 text-xs sm:gap-5">
        {['Choose a product', 'Shape your story', 'Make it yours'].map((step, index) => (
          <div className="flex items-center gap-3" key={step}>
            <span
              className={`grid size-7 place-items-center rounded-full ${index === 0 ? 'bg-forest text-lime' : 'border border-line bg-white text-muted'}`}
            >
              {index + 1}
            </span>
            <span className={index === 0 ? 'font-semibold' : 'text-muted'}>{step}</span>
            {index < 2 && <ArrowRight size={13} className="hidden text-stone-300 sm:block" />}
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <section className="panel p-6">
          <h2 className="mb-1 text-lg font-semibold">Start with something special</h2>
          <p className="mb-6 text-sm text-muted">
            Your product will be the heart of your campaign.
          </p>
          <fieldset disabled className="space-y-5">
            <legend className="sr-only">Campaign details — coming in a future phase</legend>
            <label className="field-label" htmlFor="campaign-product">
              Product
              <select id="campaign-product" className="field mt-2" defaultValue="">
                <option value="">Your products will appear here</option>
              </select>
            </label>
            <label className="field-label" htmlFor="campaign-goal">
              What would you like to share?
              <textarea
                id="campaign-goal"
                className="field mt-2 min-h-28 resize-none"
                placeholder="A new arrival, a weekend offer, a local favorite…"
              />
            </label>
            <label className="field-label" htmlFor="campaign-tone">
              Your tone of voice
              <select id="campaign-tone" className="field mt-2" defaultValue="friendly">
                <option value="friendly">Warm & friendly</option>
              </select>
            </label>
            <button className="button-primary w-full">
              <Sparkles size={16} />
              Generate campaign · Coming soon
            </button>
          </fieldset>
        </section>
        <section className="panel flex min-h-80 flex-col p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Your creative canvas</h2>
            <span className="badge">Preview</span>
          </div>
          <div className="my-6 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#d2dace] bg-[#f5f7f1] p-7 text-center">
            <Image size={35} strokeWidth={1.2} className="mb-4 text-sage" />
            <h3 className="display-heading text-2xl text-forest">A story waiting to happen.</h3>
            <p className="mt-3 max-w-60 text-xs leading-6 text-muted">
              Future campaign previews will appear here. For now, enjoy the possibilities.
            </p>
          </div>
          <p className="text-center text-[11px] text-muted">
            Made for your business. Written in your voice.
          </p>
        </section>
      </div>
    </>
  );
}
