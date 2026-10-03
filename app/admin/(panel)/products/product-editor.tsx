'use client';

import type {
  AttributeDef,
  Brand,
  CategoryNode,
  OptionDef,
  ProductDetail,
} from '@aussie/shared-types';
import { MAX_VARIANT_OPTIONS } from '@aussie/shared-types';
import { Alert, Button, Card, Checkbox, Field, Input, Select, Textarea } from '@aussie/ui';
import { productInputSchema } from '@aussie/validation';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import {
  buildInput,
  definitionsFor,
  type EditorState,
  extraIssues,
  fieldsFromValues,
  flattenTree,
  newRow,
  rowFromVariant,
  type VariantRow,
} from '@/lib/editor-model';
import { saveProductAction } from '../catalog/actions';
import { AttributeFieldsEditor } from './attribute-fields';

/** Indentation by category depth (fixed class names so Tailwind can see them). */
const INDENT = ['pl-0', 'pl-5', 'pl-10', 'pl-14', 'pl-20'];

export function ProductEditor({
  product,
  brands,
  categories,
  attributeDefs,
  optionDefs,
}: {
  product?: ProductDetail;
  brands: Brand[];
  categories: CategoryNode[];
  attributeDefs: AttributeDef[];
  optionDefs: OptionDef[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [banner, setBanner] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);

  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [brandId, setBrandId] = useState(product?.brandId ?? '');
  const [status, setStatus] = useState<EditorState['status']>(product?.status ?? 'DRAFT');
  const [description, setDescription] = useState(product?.description ?? '');
  const [highlights, setHighlights] = useState((product?.highlights ?? []).join('\n'));
  const [countryOfOrigin, setCountryOfOrigin] = useState(product?.countryOfOrigin ?? '');
  const [categoryIds, setCategoryIds] = useState<string[]>(product?.categoryIds ?? []);
  const [attributes, setAttributes] = useState(fieldsFromValues(product?.attributes ?? {}));
  const [optionKeys, setOptionKeys] = useState<string[]>(product?.optionKeys ?? []);
  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.length ? product.variants.map(rowFromVariant) : [newRow(true)],
  );

  const flat = useMemo(() => flattenTree(categories), [categories]);
  const flatCategories = useMemo(() => flat.map((f) => f.node), [flat]);
  const defs = useMemo(
    () => definitionsFor(flatCategories, attributeDefs, optionDefs, categoryIds),
    [flatCategories, attributeDefs, optionDefs, categoryIds],
  );
  const activeKeys = optionKeys.filter((k) => defs.options.some((o) => o.key === k));

  const err = (path: string) => errors.get(path);
  const toggleCategory = (id: string) =>
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const toggleOption = (key: string) =>
    setOptionKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));
  const updateRow = (key: string, patch: Partial<VariantRow>) =>
    setVariants((rows) =>
      rows.map((r) =>
        r.key === key ? { ...r, ...patch } : patch.isDefault ? { ...r, isDefault: false } : r,
      ),
    );
  const setOpt = (rowKey: string, optKey: string, patch: Partial<{ value: string; hex: string }>) =>
    setVariants((rows) =>
      rows.map((r) =>
        r.key === rowKey
          ? {
              ...r,
              opts: {
                ...r.opts,
                [optKey]: {
                  value: '',
                  hex: '',
                  ...Object.entries(r.opts).find(([k]) => k === optKey)?.[1],
                  ...patch,
                },
              },
            }
          : r,
      ),
    );

  const state = (): EditorState => ({
    name,
    slug,
    brandId,
    status,
    description,
    highlights,
    countryOfOrigin,
    categoryIds,
    attributes,
    optionKeys: activeKeys,
    variants,
  });

  function submit() {
    setBanner(null);
    const input = buildInput(state(), defs);
    const map = new Map<string, string>();
    for (const i of extraIssues(input, defs)) if (!map.has(i.path)) map.set(i.path, i.message);
    const parsed = productInputSchema.safeParse(input);
    if (!parsed.success) {
      for (const i of parsed.error.issues) {
        const key = i.path.join('.');
        if (!map.has(key)) map.set(key, i.message);
      }
    }
    if (map.size > 0) {
      setErrors(map);
      setBanner({ tone: 'danger', text: 'Please fix the highlighted fields.' });
      return;
    }
    setErrors(new Map());
    startTransition(async () => {
      const result = await saveProductAction(product?.id ?? null, input);
      if (!result.ok || !result.product) {
        setErrors(new Map(Object.entries(result.fieldErrors ?? {})));
        setBanner({ tone: 'danger', text: result.error ?? 'Could not save.' });
        return;
      }
      if (!product) {
        router.push(`/admin/products/${result.product.id}?created=1`);
        return;
      }
      setBanner({ tone: 'success', text: 'Saved.' });
      router.refresh();
    });
  }

  const hasImages = (product?.images ?? []).some((i) => i.status === 'READY');
  const highlightError = [...errors].find(([k]) => k.startsWith('highlights'))?.[1];

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-6 lg:grid-cols-[1fr_280px]"
    >
      <div className="space-y-6">
        {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

        <Card>
          <h2 className="text-h3">Basics</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field id="name" label="Product name" error={err('name')} className="md:col-span-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                invalid={!!err('name')}
                required
              />
            </Field>
            <Field id="brandId" label="Brand" error={err('brandId')} optional>
              <Select
                id="brandId"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                invalid={!!err('brandId')}
              >
                <option value="">No brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              id="slug"
              label="URL name"
              hint="Leave empty to generate from the name"
              error={err('slug')}
              optional
            >
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                invalid={!!err('slug')}
                hasHint
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="text-h3">Categories</h2>
          <p className="mt-1 text-sm text-muted">
            Pick where the product belongs. The categories decide which details and variant options
            are offered below.
          </p>
          {err('categoryIds') && <p className="mt-2 text-sm text-danger">{err('categoryIds')}</p>}
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-sm border border-border p-3">
            {flat.map(({ node, depth }) => (
              <div key={node.id} className={INDENT[Math.min(depth, INDENT.length) - 1]}>
                <Checkbox
                  id={`cat-${node.id}`}
                  label={
                    <span className={depth === 1 ? 'font-medium' : undefined}>{node.name}</span>
                  }
                  checked={categoryIds.includes(node.id)}
                  onChange={() => toggleCategory(node.id)}
                />
              </div>
            ))}
            {flat.length === 0 && <p className="text-sm text-muted">No categories yet.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="text-h3">Description</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              id="description"
              label="Description"
              error={err('description')}
              className="md:col-span-2"
            >
              <Textarea
                id="description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                invalid={!!err('description')}
              />
            </Field>
            <Field
              id="highlights"
              label="Key features"
              hint="One per line, up to 8"
              error={highlightError}
              optional
              className="md:col-span-2"
            >
              <Textarea
                id="highlights"
                rows={4}
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
              />
            </Field>
            <Field id="countryOfOrigin" label="Country of origin" optional>
              <Input
                id="countryOfOrigin"
                value={countryOfOrigin}
                onChange={(e) => setCountryOfOrigin(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="text-h3">Product details</h2>
          {categoryIds.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Pick a category to see the details it asks for.
            </p>
          ) : (
            <AttributeFieldsEditor
              defs={defs.attributes}
              values={attributes}
              errors={errors}
              onChange={(key, value) => setAttributes((a) => ({ ...a, [key]: value }))}
            />
          )}
        </Card>

        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-h3">Variants & pricing</h2>
            <p className="text-xs text-muted">
              Prices in rupees. Sale = regular (compare-at) price shown crossed out.
            </p>
          </div>

          <fieldset className="mt-4">
            <legend className="text-sm font-medium">
              How do the variants differ?{' '}
              <span className="font-normal text-muted">
                (up to {MAX_VARIANT_OPTIONS}; leave empty for a single product)
              </span>
            </legend>
            {defs.options.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                {categoryIds.length === 0
                  ? 'Pick a category first.'
                  : 'The chosen categories have no variant options. Add some under Categories.'}
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {defs.options.map((o) => (
                  <Checkbox
                    key={o.key}
                    id={`opt-${o.key}`}
                    label={o.label}
                    checked={activeKeys.includes(o.key)}
                    disabled={
                      !activeKeys.includes(o.key) && activeKeys.length >= MAX_VARIANT_OPTIONS
                    }
                    onChange={() => toggleOption(o.key)}
                  />
                ))}
              </div>
            )}
            {err('optionKeys') && <p className="mt-2 text-sm text-danger">{err('optionKeys')}</p>}
          </fieldset>

          {err('variants') && <p className="mt-2 text-sm text-danger">{err('variants')}</p>}
          <div className="mt-4 space-y-4">
            {variants.map((v, i) => {
              const e = (f: string) => err(`variants.${i}.${f}`);
              return (
                <fieldset key={v.key} className="rounded-sm border border-border p-4">
                  <legend className="px-1 text-sm font-medium">Variant {i + 1}</legend>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field id={`sku-${v.key}`} label="SKU" error={e('sku')}>
                      <Input
                        id={`sku-${v.key}`}
                        value={v.sku}
                        onChange={(ev) => updateRow(v.key, { sku: ev.target.value.toUpperCase() })}
                        invalid={!!e('sku')}
                      />
                    </Field>
                    {activeKeys.map((key) => {
                      const def = defs.options.find((o) => o.key === key);
                      if (!def) return null;
                      const cell = Object.entries(v.opts).find(([k]) => k === key)?.[1];
                      const value = cell?.value ?? '';
                      const hex = cell?.hex ?? '';
                      const id = `${key}-${v.key}`;
                      const error = e(`opt.${key}`);
                      const listId = def.suggestions?.length ? `${id}-list` : undefined;
                      return (
                        <div
                          key={key}
                          className={def.kind === 'color' ? 'sm:col-span-2' : undefined}
                        >
                          <Field id={id} label={def.label} error={error}>
                            <div className="flex gap-2">
                              {def.kind === 'color' && (
                                <input
                                  type="color"
                                  aria-label={`Pick ${def.label.toLowerCase()} colour`}
                                  value={/^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#C8A165'}
                                  onChange={(ev) =>
                                    setOpt(v.key, key, { hex: ev.target.value.toUpperCase() })
                                  }
                                  className="h-11 w-12 shrink-0 cursor-pointer rounded-sm border border-border bg-surface"
                                />
                              )}
                              <Input
                                id={id}
                                list={listId}
                                value={value}
                                onChange={(ev) => setOpt(v.key, key, { value: ev.target.value })}
                                invalid={!!error}
                              />
                              {def.kind === 'color' && (
                                <Input
                                  id={`${id}-hex`}
                                  aria-label={`${def.label} colour code`}
                                  className="w-28"
                                  value={hex}
                                  placeholder="#C8A165"
                                  onChange={(ev) => setOpt(v.key, key, { hex: ev.target.value })}
                                />
                              )}
                            </div>
                          </Field>
                          {listId && (
                            <datalist id={listId}>
                              {def.suggestions?.map((s) => (
                                <option key={s} value={s} />
                              ))}
                            </datalist>
                          )}
                        </div>
                      );
                    })}
                    {e('options') && (
                      <p className="col-span-full text-sm text-danger">{e('options')}</p>
                    )}
                    <Field id={`price-${v.key}`} label="Price (Rs)" error={e('priceCents')}>
                      <Input
                        id={`price-${v.key}`}
                        inputMode="decimal"
                        value={v.price}
                        onChange={(ev) => updateRow(v.key, { price: ev.target.value })}
                        invalid={!!e('priceCents')}
                      />
                    </Field>
                    <Field
                      id={`cmp-${v.key}`}
                      label="Regular price (Rs)"
                      hint="Only when on sale"
                      error={e('compareAtCents')}
                      optional
                    >
                      <Input
                        id={`cmp-${v.key}`}
                        inputMode="decimal"
                        value={v.compareAt}
                        onChange={(ev) => updateRow(v.key, { compareAt: ev.target.value })}
                        invalid={!!e('compareAtCents')}
                        hasHint
                      />
                    </Field>
                    <Field
                      id={`w-${v.key}`}
                      label="Weight (g)"
                      hint="Packed, for delivery fees"
                      error={e('weightG')}
                    >
                      <Input
                        id={`w-${v.key}`}
                        inputMode="numeric"
                        value={v.weightG}
                        onChange={(ev) => updateRow(v.key, { weightG: ev.target.value })}
                        invalid={!!e('weightG')}
                        hasHint
                      />
                    </Field>
                    <fieldset className="col-span-full">
                      <legend className="text-sm font-medium">
                        Packed size (cm) <span className="font-normal text-muted">(optional)</span>
                      </legend>
                      <p className="text-xs text-muted">
                        Bulky items cost more to ship: delivery uses the higher of weight and size.
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-3">
                        <Field id={`lengthCm-${v.key}`} label="Length" error={e('lengthCm')}>
                          <Input
                            id={`lengthCm-${v.key}`}
                            inputMode="numeric"
                            value={v.lengthCm}
                            onChange={(ev) => updateRow(v.key, { lengthCm: ev.target.value })}
                            invalid={!!e('lengthCm')}
                          />
                        </Field>
                        <Field id={`widthCm-${v.key}`} label="Width" error={e('widthCm')}>
                          <Input
                            id={`widthCm-${v.key}`}
                            inputMode="numeric"
                            value={v.widthCm}
                            onChange={(ev) => updateRow(v.key, { widthCm: ev.target.value })}
                            invalid={!!e('widthCm')}
                          />
                        </Field>
                        <Field id={`heightCm-${v.key}`} label="Height" error={e('heightCm')}>
                          <Input
                            id={`heightCm-${v.key}`}
                            inputMode="numeric"
                            value={v.heightCm}
                            onChange={(ev) => updateRow(v.key, { heightCm: ev.target.value })}
                            invalid={!!e('heightCm')}
                          />
                        </Field>
                      </div>
                    </fieldset>
                    <div className="flex items-end justify-between gap-2">
                      <label className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="defaultVariant"
                          checked={v.isDefault}
                          onChange={() => updateRow(v.key, { isDefault: true })}
                          className="size-4 accent-primary"
                        />
                        Default
                      </label>
                      {variants.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setVariants((rows) => {
                              const left = rows.filter((r) => r.key !== v.key);
                              const first = left[0];
                              return v.isDefault && first
                                ? left.map((r) => ({ ...r, isDefault: r.key === first.key }))
                                : left;
                            })
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </fieldset>
              );
            })}
            {variants.length < 40 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVariants((rows) => [...rows, newRow()])}
              >
                + Add variant
              </Button>
            )}
          </div>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <Field id="status" label="Status">
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="DRAFT">Draft (hidden)</option>
              <option value="ACTIVE" disabled={!hasImages}>
                Active (on the store){hasImages ? '' : ' — add an image first'}
              </option>
              <option value="ARCHIVED">Archived (hidden)</option>
            </Select>
          </Field>
          <Button type="submit" className="mt-4 w-full" disabled={pending}>
            {pending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
          </Button>
          {!product && (
            <p className="mt-3 text-xs text-muted">
              You can add images after creating the product.
            </p>
          )}
        </Card>
      </aside>
    </form>
  );
}
