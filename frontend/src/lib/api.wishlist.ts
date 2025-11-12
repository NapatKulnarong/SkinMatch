const API_BASE = "/api";

type WishlistProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  currency: string;
  image: string | null;
  product_url: string | null;
  saved_at: string;
};

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
  const res = await fetch(`${API_BASE}/wishlist`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return handleJson<WishlistProduct[]>(res);
}

export async function addToWishlist(productId: string, token: string): Promise<{ ok: boolean; status: string }>{
  const res = await fetch(`${API_BASE}/wishlist/add`, {
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
  const res = await fetch(`${API_BASE}/wishlist/${productId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleJson<{ ok: boolean; status: string }>(res);
}

export type { WishlistProduct };


