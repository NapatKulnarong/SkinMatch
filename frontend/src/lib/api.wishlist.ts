import { resolveApiBase, resolveMediaUrl } from "./apiBase";

type RawWishlistProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number | string;
  currency: string;
  image: string | null;
  product_url: string | null;
  saved_at: string;
};

export type WishlistProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  currency: string;
  image: string | null;
  productUrl: string | null;
  savedAt: string;
};

const getApiBase = () => resolveApiBase();

const mapWishlistProduct = (raw: RawWishlistProduct): WishlistProduct => ({
  id: raw.id,
  slug: raw.slug,
  name: raw.name,
  brand: raw.brand,
  category: raw.category,
  price: typeof raw.price === "number" ? raw.price : Number(raw.price || 0),
  currency: raw.currency,
  image: resolveMediaUrl(raw.image),
  productUrl: raw.product_url ?? null,
  savedAt: raw.saved_at,
});

async function handleJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Unexpected server response");
  }
  if (!res.ok) {
    const message =
      typeof json === "object" && json !== null && "message" in json
        ? String((json as { message?: unknown }).message ?? res.statusText)
        : res.statusText;
    throw new Error(message);
  }
  return json as T;
}

export async function fetchWishlist(token: string): Promise<WishlistProduct[]> {
  const res = await fetch(`${getApiBase()}/wishlist`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await handleJson<RawWishlistProduct[]>(res);
  return data.map(mapWishlistProduct);
}

export async function addToWishlist(productId: string, token: string): Promise<{ ok: boolean; status: string }>{
  const res = await fetch(`${getApiBase()}/wishlist/add`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ product_id: productId }),
  });
  return handleJson<{ ok: boolean; status: string }>(res);
}

export async function removeFromWishlist(productId: string, token: string): Promise<{ ok: boolean; status: string }>{
  const res = await fetch(`${getApiBase()}/wishlist/${productId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleJson<{ ok: boolean; status: string }>(res);
}
