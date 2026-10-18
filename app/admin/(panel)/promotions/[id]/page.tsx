import type { PromotionView } from '@aussie/shared-types';
import { Trash2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ActionForm } from '../../action-form';
import { Badge, ConfirmAction, formatLkr, PageHeader, Panel, Stat } from '@/app/admin/_ui';
import { can, requirePermission } from '@/lib/admin';
import { api, ApiError } from '@/lib/api';
import { describeDiscount, describeScope, STATUS_LABEL, STATUS_TONE } from '@/lib/promotions';
import { deletePromotionAction, updatePromotionAction } from '../actions';
import { loadPickOptions } from '../options';
import { PromotionFields } from '../promotion-fields';

export const metadata = { title: 'Promotion' };

export default async function PromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermission('promotion:read');
  const { id } = await params;
  let promo: PromotionView;
  try {
    promo = await api<PromotionView>('admin', `/v1/orders/admin/promotions/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
  const canEdit = can(me, 'promotion:write');
  const { categories, products } = canEdit
    ? await loadPickOptions()
    : { categories: [], products: [] };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{promo.code}</span>
            <Badge tone={STATUS_TONE[promo.status]}>{STATUS_LABEL[promo.status]}</Badge>
          </span>
        }
        back={{ href: '/admin/promotions', label: 'Promotions' }}
        description={`${promo.name} · ${describeDiscount(promo)} · ${describeScope(promo)}`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Times used"
          value={promo.usedCount}
          note={`of ${promo.maxUses ?? 'unlimited'}`}
        />
        <Stat
          label="Discount given"
          value={formatLkr(promo.totalDiscountCents)}
          note="Products only, cancelled orders excluded"
        />
        <Stat
          label="Uses left"
          value={
            promo.maxUses === undefined ? 'Unlimited' : Math.max(0, promo.maxUses - promo.usedCount)
          }
        />
      </div>

      {canEdit ? (
        <>
          <Panel title="Edit promotion">
            <ActionForm action={updatePromotionAction} submitLabel="Save changes">
              <input type="hidden" name="id" value={promo.id} />
              <PromotionFields promo={promo} categories={categories} products={products} />
            </ActionForm>
          </Panel>
          <Panel
            title="Delete"
            description={
              promo.usedCount > 0
                ? 'This code has been used, so it cannot be deleted. Untick Active above to pause it.'
                : 'Nobody has used this code yet, so it can be removed completely.'
            }
          >
            {promo.usedCount === 0 && (
              <ConfirmAction
                action={deletePromotionAction}
                fields={{ id: promo.id }}
                title={`Delete ${promo.code}?`}
                description="The code stops working and can be created again later."
                confirmLabel="Delete promotion"
                variant="danger-soft"
              >
                <Trash2 aria-hidden size={14} /> Delete promotion
              </ConfirmAction>
            )}
          </Panel>
        </>
      ) : (
        <p className="text-sm text-muted">Your role can view promotions but not change them.</p>
      )}
    </div>
  );
}
