import { Link } from 'react-router';
import { Megaphone, Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PhaseNotice from '../components/PhaseNotice.jsx';

export default function CampaignsPage() {
  return (
    <>
      <PageHeader
        eyebrow="IDEAS WITH SOMEWHERE TO GO"
        title="Campaigns"
        description="Give your local business a voice that feels like you."
      >
        <Link className="button-primary" to="/dashboard/campaigns/new">
          <Plus size={16} />
          New campaign
        </Link>
      </PageHeader>
      <section className="panel mb-6">
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="text-sm font-semibold">All campaigns</h2>
          <span className="badge">0 campaigns</span>
        </div>
        <EmptyState
          icon={Megaphone}
          title="A blank page. A big opportunity."
          description="Your campaign collection starts here. Take a look at the builder while we prepare the next chapter."
          to="/dashboard/campaigns/new"
          linkLabel="Preview the campaign builder"
        />
      </section>
      <PhaseNotice>
        Campaign creation, saving, and publishing are planned for future phases.
      </PhaseNotice>
    </>
  );
}
