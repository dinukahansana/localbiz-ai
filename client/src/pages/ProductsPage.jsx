import { Package, Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PhaseNotice from '../components/PhaseNotice.jsx';

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        eyebrow="YOUR BUSINESS, ON DISPLAY"
        title="Products"
        description="A home for the things you make, sell, and love."
      >
        <button className="button-primary" disabled>
          <Plus size={16} />
          Add product
        </button>
      </PageHeader>
      <section className="panel mb-6">
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="text-sm font-semibold">Your catalog</h2>
          <span className="badge">0 products</span>
        </div>
        <EmptyState
          icon={Package}
          title="Every great story starts with a product"
          description="Your products will live here. Adding, editing, and saving products will be available in a future phase."
          to="/dashboard"
          linkLabel="Back to your workspace"
        />
      </section>
      <PhaseNotice>
        The product catalog is an empty shell for now. No products are stored or uploaded.
      </PhaseNotice>
    </>
  );
}
