import { ActionForm } from '../../action-form';
import { PageHeader, Panel } from '@/app/admin/_ui';
import { requirePermission } from '@/lib/admin';
import { createPromotionAction } from '../actions';
import { loadPickOptions } from '../options';
import { PromotionFields } from '../promotion-fields';

export const metadata = { title: 'New promotion' };

export default async function NewPromotionPage() {
  await requirePermission('promotion:write');
  const { categories, products } = await loadPickOptions();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="New promotion"
        back={{ href: '/admin/promotions', label: 'Promotions' }}
        description="Customers type the code at checkout. You can pause it any time."
      />
      <Panel title="Promotion">
        <ActionForm action={createPromotionAction} submitLabel="Create promotion">
          <PromotionFields categories={categories} products={products} />
        </ActionForm>
      </Panel>
    </div>
  );
}
