/** Full base URL of a product image's renditions (`<cdn>/media/<productId>/<imageId>`). */
export const imageUrl = (base: string) => `${process.env.NEXT_PUBLIC_CDN_URL ?? ''}/${base}`;
