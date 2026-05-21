/**
 * Centralised query keys. Keep the shape predictable so mutation handlers
 * elsewhere in the app can invalidate the right slice without duplicating
 * string arrays. Factory functions return tuples that TanStack Query
 * compares structurally for cache identity.
 *
 * Convention: `[domain, scope, ...filters]`. Stop at the depth where you'd
 * want to invalidate — e.g. `queryClient.invalidateQueries({ queryKey:
 * queryKeys.vendor.orders() })` blows away every `(...filters)` variant.
 */
export const queryKeys = {
  // Consumer / shared
  catalogue: () => ['catalogue'] as const,
  order: (orderId: string | null) => ['order', orderId] as const,
  user: {
    me: () => ['user', 'me'] as const,
    addresses: () => ['user', 'addresses'] as const,
  },
  publicVendor: (vendorId: string) => ['public-vendor', vendorId] as const,

  // Vendor self-service
  vendor: {
    me: () => ['vendor', 'me'] as const,
    balance: () => ['vendor', 'balance'] as const,
    availability: () => ['vendor', 'availability'] as const,
    hours: () => ['vendor', 'hours'] as const,
    orders: (type: 'immediate' | 'preorder' = 'immediate') => ['vendor', 'orders', type] as const,
    order: (orderId: string) => ['vendor', 'order', orderId] as const,
    menuCategories: () => ['vendor', 'menu-categories'] as const,
    menuItems: () => ['vendor', 'menu-items'] as const,
  },

  // Rider self-service
  rider: {
    me: () => ['rider', 'me'] as const,
    balance: () => ['rider', 'balance'] as const,
    availability: () => ['rider', 'availability'] as const,
    courses: () => ['rider', 'courses'] as const,
  },

  // Admin
  admin: {
    validationQueues: () => ['admin', 'validation-queues'] as const,
  },
} as const;
