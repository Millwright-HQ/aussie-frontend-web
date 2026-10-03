import {
  type AttributeDef,
  type AttributeValue,
  type Category,
  MAX_CATEGORY_DEPTH,
  type ProductSpec,
} from '@aussie/shared-types';

/**
 * Pure rules of the category-defined catalogue, shared by the catalog service (authoritative) and
 * the admin product form (instant feedback). No I/O.
 */

export interface ValueIssue {
  /** Dotted path in the product input, e.g. `attributes.skin_type`. */
  path: string;
  message: string;
}

// ── Category tree ─────────────────────────────────────────────────────────────

/** [self, parent, grandparent, …, root]. Stops on a cycle or a missing parent. */
export function ancestorChain(categories: Category[], id: string): Category[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const chain: Category[] = [];
  const seen = new Set<string>();
  let current = byId.get(id);
  while (current && !seen.has(current.id) && chain.length < MAX_CATEGORY_DEPTH + 1) {
    chain.push(current);
    seen.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

/** Levels from the top: a top-level category is 1. */
export const categoryDepth = (categories: Category[], id: string) =>
  ancestorChain(categories, id).length;

/** The category and everything below it. */
export function descendantIds(categories: Category[], id: string): Set<string> {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** Levels in the subtree under (and including) a category: a leaf is 1. */
export function subtreeHeight(categories: Category[], id: string): number {
  const children = categories.filter((c) => c.parentId === id);
  return 1 + Math.max(0, ...children.map((c) => subtreeHeight(categories, c.id)));
}

// ── Definitions that apply to a product ───────────────────────────────────────

interface Def {
  categoryId: string;
  key: string;
  sortOrder: number;
}

/**
 * The definitions (attributes or options) that apply to a product in the given categories: each
 * category's own plus everything inherited from its ancestors. When a key is defined more than once,
 * the first one found wins: categories in the order given, nearest ancestor first. General fields
 * (defined higher up) are listed before specific ones.
 */
export function effectiveDefs<T extends Def>(
  categories: Category[],
  defs: T[],
  categoryIds: string[],
): T[] {
  const picked = new Map<string, { def: T; depth: number }>();
  for (const categoryId of categoryIds) {
    for (const category of ancestorChain(categories, categoryId)) {
      const depth = categoryDepth(categories, category.id);
      for (const def of defs) {
        if (def.categoryId === category.id && !picked.has(def.key))
          picked.set(def.key, { def, depth });
      }
    }
  }
  return [...picked.values()]
    .sort(
      (a, b) =>
        a.depth - b.depth ||
        a.def.sortOrder - b.def.sortOrder ||
        a.def.key.localeCompare(b.def.key),
    )
    .map((x) => x.def);
}

// ── Attribute values ──────────────────────────────────────────────────────────

export const MAX_TEXT_LENGTH = 200;
export const MAX_LONG_TEXT_LENGTH = 5000;

const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Checks values against the definitions of the product's categories. Unknown keys are rejected.
 * "Required" attributes are only enforced when publishing (`requireRequired`), so drafts can be
 * saved half-filled.
 */
export function validateAttributeValues(
  defs: AttributeDef[],
  values: Record<string, unknown>,
  opts: { requireRequired: boolean },
): ValueIssue[] {
  const issues: ValueIssue[] = [];
  const byKey = new Map(defs.map((d) => [d.key, d]));
  for (const key of Object.keys(values)) {
    if (!byKey.has(key)) {
      issues.push({
        path: `attributes.${key}`,
        message: 'Not an attribute of this product’s categories',
      });
    }
  }
  for (const def of defs) {
    const path = `attributes.${def.key}`;
    const value = Object.hasOwn(values, def.key) ? values[def.key] : undefined;
    if (isEmpty(value)) {
      if (def.required && opts.requireRequired)
        issues.push({ path, message: `${def.label} is required` });
      continue;
    }
    const bad = (message: string) => issues.push({ path, message });
    switch (def.type) {
      case 'text': {
        const max = def.long ? MAX_LONG_TEXT_LENGTH : MAX_TEXT_LENGTH;
        if (typeof value !== 'string') bad(`${def.label} must be text`);
        else if (value.length > max) bad(`${def.label} is too long (max ${max} characters)`);
        break;
      }
      case 'number':
        if (typeof value !== 'number' || !Number.isFinite(value))
          bad(`${def.label} must be a number`);
        else if (Math.abs(value) > 1e9) bad(`${def.label} is out of range`);
        break;
      case 'boolean':
        if (typeof value !== 'boolean') bad(`${def.label} must be Yes or No`);
        break;
      case 'choice':
        if (typeof value !== 'string' || !def.choices?.some((c) => c.value === value)) {
          bad(`Choose a valid ${def.label}`);
        }
        break;
      case 'multichoice': {
        const allowed = new Set(def.choices?.map((c) => c.value));
        if (
          !Array.isArray(value) ||
          new Set(value).size !== value.length ||
          !value.every((v) => typeof v === 'string' && allowed.has(v))
        ) {
          bad(`Choose valid options for ${def.label}`);
        }
        break;
      }
    }
  }
  return issues;
}

/** Drops empty values so products only store what was actually filled in. */
export function compactAttributes(
  values: Record<string, AttributeValue>,
): Record<string, AttributeValue> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => !isEmpty(v)));
}

/** Product-page rows for the filled-in attributes, in definition order. */
export function formatSpecs(
  defs: AttributeDef[],
  values: Record<string, AttributeValue>,
): ProductSpec[] {
  const specs: ProductSpec[] = [];
  for (const def of defs) {
    const value = Object.hasOwn(values, def.key) ? values[def.key] : undefined;
    if (value === undefined || isEmpty(value)) continue;
    const label = (v: string) => def.choices?.find((c) => c.value === v)?.label ?? v;
    let text: string;
    if (typeof value === 'boolean') text = value ? 'Yes' : 'No';
    else if (typeof value === 'number') text = def.unit ? `${value} ${def.unit}` : String(value);
    else if (Array.isArray(value)) text = value.map(label).join(', ');
    else text = def.type === 'choice' ? label(value) : value;
    specs.push({ key: def.key, label: def.label, value: text, long: Boolean(def.long) });
  }
  return specs;
}
