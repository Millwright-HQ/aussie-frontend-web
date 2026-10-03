import type { AttributeDef, AttributeType, OptionDef } from '@aussie/shared-types';
import { Card, Field, Input, Select, Textarea } from '@aussie/ui';
import { ancestorChain, effectiveDefs } from '@aussie/validation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/admin';
import { categoryTrail, getCategoryTree } from '@/lib/catalog';
import { getDefinitions } from '@/lib/definitions';
import { flattenTree } from '@/lib/editor-model';
import { ActionForm } from '../../action-form';
import {
  deleteDefinitionAction,
  saveAttributeAction,
  saveOptionAction,
} from '../../catalog/actions';

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
            <p className="text-sm font-medium">Type</p>
            <p className="flex min-h-11 items-center text-sm text-muted">
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
            <p className="text-sm font-medium">Kind</p>
            <p className="flex min-h-11 items-center text-sm text-muted">
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
    <details>
      <summary className="cursor-pointer text-xs text-danger">Delete…</summary>
      <ActionForm
        action={deleteDefinitionAction.bind(null, categoryId)}
        submitLabel={`Delete ${label}`}
        variant="danger"
        size="sm"
        className="mt-2"
      >
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="key" value={defKey} />
      </ActionForm>
    </details>
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
      <div>
        <Link href="/admin/categories" className="text-sm text-muted hover:text-text">
          ← Categories
        </Link>
        <h1 className="mt-2 text-h1">{category.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {trail.map((c) => c.name).join(' › ')}. Fields and options added here also apply to every
          category below this one.
        </p>
      </div>

      {(inheritedAttributes.length > 0 || inheritedOptions.length > 0) && (
        <Card>
          <h2 className="text-h3">Inherited from parent categories</h2>
          <p className="mt-1 text-sm text-muted">Change these on the category that defines them.</p>
          <ul className="mt-3 space-y-1 text-sm">
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
        </Card>
      )}

      <section aria-labelledby="fields" className="space-y-4">
        <h2 id="fields" className="text-h2">
          Fields (product details)
        </h2>
        <ul className="divide-y divide-border rounded-md border border-border bg-surface">
          {own.attributes.length === 0 && (
            <li className="p-4 text-sm text-muted">No fields on this category yet.</li>
          )}
          {own.attributes.map((a) => (
            <li key={a.id} className="p-4">
              <details>
                <summary className="cursor-pointer">
                  <span className="font-medium">{a.label}</span>{' '}
                  <span className="text-sm text-muted">{describe(a)}</span>
                </summary>
                <div className="mt-3 space-y-3">
                  <AttributeForm categoryId={id} def={a} />
                  <DeleteDef categoryId={id} kind="attribute" defKey={a.key} label={a.label} />
                </div>
              </details>
            </li>
          ))}
        </ul>
        <Card>
          <h3 className="text-h3">Add a field</h3>
          <div className="mt-4">
            <AttributeForm categoryId={id} />
          </div>
        </Card>
      </section>

      <section aria-labelledby="options" className="space-y-4">
        <h2 id="options" className="text-h2">
          Variant options
        </h2>
        <p className="text-sm text-muted">
          What variants of a product differ by (colour, size, storage…). A product can combine up to
          3.
        </p>
        <ul className="divide-y divide-border rounded-md border border-border bg-surface">
          {own.options.length === 0 && (
            <li className="p-4 text-sm text-muted">No options on this category yet.</li>
          )}
          {own.options.map((o) => (
            <li key={o.id} className="p-4">
              <details>
                <summary className="cursor-pointer">
                  <span className="font-medium">{o.label}</span>{' '}
                  <span className="text-sm text-muted">
                    {o.kind === 'color' ? 'colour swatch' : 'text'}
                  </span>
                </summary>
                <div className="mt-3 space-y-3">
                  <OptionForm categoryId={id} def={o} />
                  <DeleteDef categoryId={id} kind="option" defKey={o.key} label={o.label} />
                </div>
              </details>
            </li>
          ))}
        </ul>
        <Card>
          <h3 className="text-h3">Add an option</h3>
          <div className="mt-4">
            <OptionForm categoryId={id} />
          </div>
        </Card>
      </section>
    </div>
  );
}
