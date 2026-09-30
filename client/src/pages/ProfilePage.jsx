import { Store } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import PhaseNotice from '../components/PhaseNotice.jsx';

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        eyebrow="THE PEOPLE BEHIND THE PRODUCTS"
        title="Business profile"
        description="Every local business has a story. This is where yours will live."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="panel p-6">
          <div className="mb-7 flex items-center gap-4 border-b border-line pb-6">
            <span className="grid size-14 place-items-center rounded-2xl bg-[#eef2e9] text-sage">
              <Store size={25} strokeWidth={1.5} />
            </span>
            <div>
              <h2 className="font-semibold">Your business details</h2>
              <p className="mt-1 text-xs text-muted">Profile editing is coming soon.</p>
            </div>
          </div>
          <fieldset disabled className="space-y-5">
            <legend className="sr-only">Business profile — preview only</legend>
            <label className="field-label" htmlFor="business-name">
              Business name
              <input id="business-name" className="field mt-2" placeholder="Your business name" />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="field-label" htmlFor="business-category">
                Category
                <select id="business-category" defaultValue="" className="field mt-2">
                  <option value="">Choose a category</option>
                </select>
              </label>
              <label className="field-label" htmlFor="business-location">
                Location
                <input
                  id="business-location"
                  className="field mt-2"
                  placeholder="Your town or city"
                />
              </label>
            </div>
            <label className="field-label" htmlFor="business-story">
              Your story
              <textarea
                id="business-story"
                className="field mt-2 min-h-28 resize-none"
                placeholder="What makes your business a neighborhood favorite?"
              />
            </label>
            <button className="button-primary">Save changes · Coming soon</button>
          </fieldset>
        </section>
        <div className="space-y-5">
          <div className="rounded-2xl bg-forest p-7 text-white">
            <Store className="mb-5 text-lime" size={28} strokeWidth={1.4} />
            <h2 className="display-heading text-3xl leading-tight">
              A business with
              <br />a little more you.
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#c4d4cc]">
              Your voice, your neighborhood, your special something. These details will help shape
              future campaigns.
            </p>
          </div>
          <PhaseNotice>No business or account information is saved in this phase.</PhaseNotice>
        </div>
      </div>
    </>
  );
}
