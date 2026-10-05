import type { AttributeDef, AttributeType, OptionDef } from '@aussie/shared-types';
import { Trash2 } from 'lucide-react';
import { ConfirmAction, Field, Input, PageHeader, Panel, Select, Textarea } from '@/app/admin/_ui';
import { ancestorChain, effectiveDefs } from '@aussie/validation';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin';
import { categoryTrail, getCategoryTree } from '@/lib/catalog';
import { getDefinitions } from '@/lib/definitions';
import { flattenTree } from '@/lib/editor-model';
import { ActionForm } from '@/app/admin/(panel)/action-form';
import {
  deleteDefinitionAction,
  saveAttributeAction,
  saveOptionAction,
} from '@/app/admin/(panel)/catalog/actions';

export const metadata = { title: 'Fields & options' };

const ATTRIBUTE_TYPES: [AttributeType, string][] = [
  ['text', 'Text'],
  ['number', 'Number'],
  ['choice', 'One choice'],
  ['multichoice', 'Several choices'],
  ['boolean', 'Yes / No'],
];

const typeLabel = (t: AttributeType) => ATTRIBUTE_TYPES.find(([k]) => k === t)?.[1] ?? t;

function describe(a: AttributeDef) {
  return [
    typeLabel(a.type),
    a.unit,
    a.long && 'long text',
    a.filterable && 'filter',
    a.required && 'required to publish',
  ]
    .filter(Boolean)
    .join(' · ');
}

function AttributeForm({ categoryId, def }: { categoryId: string; def?: AttributeDef }) {
  const key = def?.key ?? 'new';
  return (
    <ActionForm
      action={saveAttributeAction.bind(null, categoryId)}
      submitLabel={def ? 'Save' : 'Add field'}
      size="sm"
    >
      {def && <input type="hidden" name="key" value={def.key} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field id={`al-${key}`} label="Name" hint="e.g. RAM, Skin type, Material">
          <Input
            id={`al-${key}`}
            name="label"
            defaultValue={def?.label}
            required
            maxLength={40}
            hasHint
          />
        </Field>
        {def ? (
          <div className="space-y-1">
            <p className="text-[13px] font-medium">Type</p>
            <p className="flex h-10 items-center text-sm text-muted">
              {typeLabel(def.type)} (fixed)
            </p>
          </div>
        ) : (
          <Field id={`at-${key}`} label="Type">
            <Select id={`at-${key}`} name="type" defaultValue="text">
              {ATTRIBUTE_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field id={`ao-${key}`} label="Order" hint="Lower shows first">
          <Input
            id={`ao-${key}`}
            name="sortOrder"
            type="number"
            min={0}
            max={999}
            defaultValue={def?.sortOrder ?? 0}
            hasHint
          />
        </Field>
        {(!def || def.type === 'number') && (
          <Field id={`au-${key}`} label="Unit" hint="Numbers only, e.g. GB, cm" optional>
            <Input id={`au-${key}`} name="unit" defaultValue={def?.unit} maxLength={12} hasHint />
          </Field>
        )}
        {(!def || def.type === 'choice' || def.type === 'multichoice') && (
          <Field
            id={`ac-${key}`}
            label="Choices"
            hint="Choice types only. One per line"
            optional={!def}
            className="sm:col-span-2"
          >
            <Textarea
              id={`ac-${key}`}
              name="choices"
              rows={4}
              defaultValue={def?.choices?.map((c) => c.label).join('\n')}
            />
          </Field>
        )}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {(!def || def.type === 'text') && (
          <label className="flex min-h-9 items-center gap-2">
            <input
              type="checkbox"
              name="long"
              defaultChecked={def?.long}
              className="size-4 accent-primary"
            />
            Long text (own section on the product page)
          </label>
        )}
        {(!def || def.type !== 'text') && (
          <label className="flex min-h-9 items-center gap-2">
            <input
              type="checkbox"
              name="filterable"
              defaultChecked={def?.filterable}
              className="size-4 accent-primary"
            />
            Show as a filter on listings
          </label>
        )}
        <label className="flex min-h-9 items-center gap-2">
          <input
            type="checkbox"
            name="required"
            defaultChecked={def?.required}
            className="size-4 accent-primary"
          />
          Required before publishing
        </label>
      </div>
    </ActionForm>
  );
}

function OptionForm({ categoryId, def }: { categoryId: string; def?: OptionDef }) {
  const key = def?.key ?? 'new';
  return (
    <ActionForm
      action={saveOptionAction.bind(null, categoryId)}
      submitLabel={def ? 'Save' : 'Add option'}
      size="sm"
    >
      {def && <input type="hidden" name="key" value={def.key} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field id={`ol-${key}`} label="Name" hint="e.g. Colour, Size, Storage">
          <Input
            id={`ol-${key}`}
            name="label"
            defaultValue={def?.label}
            required
            maxLength={40}
            hasHint
          />
        </Field>
        {def ? (
          <div className="space-y-1">
            <p className="text-[13px] font-medium">Kind</p>
            <p className="flex h-10 items-center text-sm text-muted">
              {def.kind === 'color' ? 'Colour swatch' : 'Text'} (fixed)
            </p>
          </div>
        ) : (
          <Field id={`ok-${key}`} label="Kind">
            <Select id={`ok-${key}`} name="kind" defaultValue="text">
              <option value="text">Text (e.g. XL, 128 GB)</option>
              <option value="color">Colour swatch</option>
            </Select>
          </Field>
        )}
        <Field id={`oo-${key}`} label="Order" hint="Lower shows first">
          <Input
            id={`oo-${key}`}
            name="sortOrder"
            type="number"
            min={0}
            max={999}
            defaultValue={def?.sortOrder ?? 0}
            hasHint
          />
        </Field>
        <Field
          id={`os-${key}`}
          label="Suggested values"
          hint="Offered while editing a product. One per line"
          optional
          className="sm:col-span-2 lg:col-span-3"
        >
          <Textarea
            id={`os-${key}`}
            name="suggestions"
            rows={3}
            defaultValue={def?.suggestions?.join('\n')}
          />
        </Field>
      </div>
    </ActionForm>
  );
}

function DeleteDef({
  categoryId,
  kind,
  defKey,
  label,
}: {
  categoryId: string;
  kind: 'attribute' | 'option';
  defKey: string;
  label: string;
}) {
  return (
    <ConfirmAction
      action={deleteDefinitionAction.bind(null, categoryId)}
      fields={{ kind, key: defKey }}
      title={`Delete ${label}?`}
      description={
        kind === 'attribute'
          ? 'Products keep any value already saved for it, but it is no longer asked for.'
          : 'Products that already use this option keep their variants.'
      }
      confirmLabel="Delete"
      variant="danger-soft"
    >
      <Trash2 aria-hidden size={14} /> Delete {kind === 'attribute' ? 'field' : 'option'}
    </ConfirmAction>
  );
}

export default async function CategoryDefinitionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission('category:write');
  const { id } = await params;
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id)) notFound();
  const [tree, defs] = await Promise.all([getCategoryTree(), getDefinitions()]);
  const trail = categoryTrail(tree, (c) => c.id === id);
  const category = trail.at(-1);
  if (!category) notFound();

  const all = flattenTree(tree).map((f) => f.node);
  // What this category already gets from its parents (not its own).
  const parentIds = ancestorChain(all, id)
    .slice(1)
    .map((c) => c.id);
  const inheritedAttributes = effectiveDefs(all, defs.attributes, parentIds);
  const inheritedOptions = effectiveDefs(all, defs.options, parentIds);
  const nameOf = (categoryId: string) => all.find((c) => c.id === categoryId)?.name ?? '';
  const own = {
    attributes: defs.attributes
      .filter((a) => a.categoryId === id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key)),
    options: defs.options
      .filter((o) => o.categoryId === id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key)),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/admin/products/categories', label: 'Categories' }}
        title={category.name}
        description={`${trail.map((c) => c.name).join(' › ')}. Fields and options added here also apply to every category below this one.`}
      />

      {(inheritedAttributes.length > 0 || inheritedOptions.length > 0) && (
        <Panel
          title="Inherited from parent categories"
          description="Change these on the category that defines them."
        >
          <ul className="space-y-1.5 text-sm">
            {inheritedAttributes.map((a) => (
              <li key={`a-${a.id}`}>
                <span className="font-medium">{a.label}</span>{' '}
                <span className="text-muted">
                  {describe(a)} · from {nameOf(a.categoryId)}
                </span>
              </li>
            ))}
            {inheritedOptions.map((o) => (
              <li key={`o-${o.id}`}>
                <span className="font-medium">{o.label}</span>{' '}
                <span className="text-muted">
                  variant option · {o.kind === 'color' ? 'colour swatch' : 'text'} · from{' '}
                  {nameOf(o.categoryId)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="fields" className="space-y-4">
          <h2 id="fields" className="text-lg font-semibold">
            Fields (product details)
          </h2>
          <Panel flush>
            {own.attributes.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No fields on this category yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {own.attributes.map((a) => (
                  <li key={a.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 hover:bg-surface-muted/50">
                        <span>
                          <span className="font-medium">{a.label}</span>
                          <span className="block text-[13px] text-muted">{describe(a)}</span>
                        </span>
                        <span className="text-[13px] text-muted group-open:text-primary">Edit</span>
                      </summary>
                      <div className="space-y-4 border-t border-border bg-surface-muted/30 px-5 py-4">
                        <AttributeForm categoryId={id} def={a} />
                        <DeleteDef
                          categoryId={id}
                          kind="attribute"
                          defKey={a.key}
                          label={a.label}
                        />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Add a field">
            <AttributeForm categoryId={id} />
          </Panel>
        </section>

        <section aria-labelledby="options" className="space-y-4">
          <div>
            <h2 id="options" className="text-lg font-semibold">
              Variant options
            </h2>
            <p className="text-[13px] text-muted">
              What variants of a product differ by (colour, size, storage…). A product can combine
              up to 3.
            </p>
          </div>
          <Panel flush>
            {own.options.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No options on this category yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {own.options.map((o) => (
                  <li key={o.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 hover:bg-surface-muted/50">
                        <span>
                          <span className="font-medium">{o.label}</span>
                          <span className="block text-[13px] text-muted">
                            {o.kind === 'color' ? 'colour swatch' : 'text'}
                          </span>
                        </span>
                        <span className="text-[13px] text-muted group-open:text-primary">Edit</span>
                      </summary>
                      <div className="space-y-4 border-t border-border bg-surface-muted/30 px-5 py-4">
                        <OptionForm categoryId={id} def={o} />
                        <DeleteDef categoryId={id} kind="option" defKey={o.key} label={o.label} />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Add an option">
            <OptionForm categoryId={id} />
          </Panel>
        </section>
      </div>
    </div>
  );
}
