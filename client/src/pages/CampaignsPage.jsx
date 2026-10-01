import { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { ArrowRight, Megaphone, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadState from '../components/LoadState.jsx';
import DeleteCampaign from '../components/DeleteCampaign.jsx';

export default function CampaignsPage() {
  const { campaigns } = useOutletContext();
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState('');
  function deleted(id) {
    campaigns.replace({
      campaigns: campaigns.data.campaigns.filter((campaign) => campaign.id !== id),
      total: campaigns.data.total - 1,
    });
    setDeleting(null);
    setMessage('Campaign draft deleted.');
  }
  return (
    <>
      <PageHeader
        eyebrow="IDEAS WITH SOMEWHERE TO GO"
        title="Campaigns"
        description="Your saved drafts, ready for a little personal touch."
      >
        <Link className="button-primary" to="/dashboard/campaigns/new">
          <Plus size={16} />
          New campaign
        </Link>
      </PageHeader>
      {message && (
        <p role="status" className="mb-5 text-sm text-forest">
          {message}
        </p>
      )}
      <LoadState resource={campaigns} label="campaigns" />
      {campaigns.data && (
        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <h2 className="text-sm font-semibold">All campaigns</h2>
            <span className="badge">
              {campaigns.data.total} {campaigns.data.total === 1 ? 'draft' : 'drafts'}
            </span>
          </div>
          {!campaigns.data.total ? (
            <EmptyState
              icon={Megaphone}
              title="A blank page. A big opportunity."
              description="Turn a product into three social post ideas, then save your first campaign here."
              to="/dashboard/campaigns/new"
              linkLabel="Create your first campaign"
            />
          ) : (
            <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
              {campaigns.data.campaigns.map((campaign) => (
                <article
                  key={campaign.id}
                  className="flex min-w-0 flex-col rounded-xl border border-line p-5"
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="badge">Draft</span>
                    <span className="badge">
                      {campaign.platform === 'facebook' ? 'Facebook' : 'Instagram'}
                    </span>
                  </div>
                  <h3 className="break-words text-base font-semibold">{campaign.title}</h3>
                  <p className="mt-2 break-words text-xs text-sage">
                    {campaign.productName} · {campaign.language}
                  </p>
                  <p className="my-4 line-clamp-3 break-words text-sm leading-6 text-muted">
                    {campaign.posts[0].caption}
                  </p>
                  <p className="mt-auto mb-4 text-[11px] text-muted">
                    3 post ideas · Updated {new Date(campaign.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                    <Link
                      className="inline-flex items-center gap-2 text-xs font-semibold text-forest"
                      to={`/dashboard/campaigns/${campaign.id}`}
                    >
                      Open & edit <ArrowRight size={14} />
                    </Link>
                    <button
                      className="icon-button shrink-0"
                      aria-label={`Delete ${campaign.title}`}
                      onClick={() => setDeleting(campaign)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      <p className="mt-5 text-xs leading-5 text-muted">
        Drafts are private to your account. Scheduling and automatic publishing are coming later.
      </p>
      {deleting && (
        <DeleteCampaign campaign={deleting} onClose={() => setDeleting(null)} onDeleted={deleted} />
      )}
    </>
  );
}
