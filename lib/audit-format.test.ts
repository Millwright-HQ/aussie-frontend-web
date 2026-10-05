import { describe, expect, it } from 'vitest';
import { actionLabel, serviceLabel } from './audit-format';

describe('audit wording', () => {
  it('names the well-known actions in plain words', () => {
    expect(actionLabel('admin.login')).toBe('Signed in');
    expect(actionLabel('session.signout')).toBe('Signed out');
    expect(actionLabel('admin.role.assign')).toBe('Changed an admin’s role');
  });

  it('describes any other action from its route', () => {
    expect(actionLabel('catalog.products.update')).toBe('Updated products');
    expect(actionLabel('orders.orders.status.create')).toBe('Created orders › status');
    expect(actionLabel('inventory.stock.adjust.create')).toBe('Created stock › adjust');
    expect(actionLabel('reviews.my.view')).toBe('Viewed my');
  });

  it('labels services', () => {
    expect(serviceLabel('identity')).toBe('Accounts');
    expect(serviceLabel('mystery')).toBe('mystery');
  });
});
