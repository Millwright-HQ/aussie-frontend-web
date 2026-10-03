import 'server-only';
import type { AttributeDef, OptionDef } from '@aussie/shared-types';
import { api } from './api';

/** Every category's attribute and option definitions (admin only; the product form works out which apply). */
export async function getDefinitions() {
  return api<{ attributes: AttributeDef[]; options: OptionDef[] }>(
    'admin',
    '/v1/catalog/admin/definitions',
  );
}
