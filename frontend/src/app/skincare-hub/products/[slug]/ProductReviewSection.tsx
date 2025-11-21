"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ChatBubbleOvalLeftEllipsisIcon, StarIcon } from "@heroicons/react/24/solid";

import {
  deleteProductReview,
  fetchProductReviews,
  submitProductReview,
  type ProductReview,
} from "@/lib/api.products";
import {
  getAuthToken,
  getStoredProfile,
  PROFILE_EVENT,
  type StoredProfile,
} from "@/lib/auth-storage";

type ProductReviewSectionProps = {
  productId: string;
  productName: string;
};

const MAX_REVIEWS = 20;

export function ProductReviewSection({ productId, productName }: ProductReviewSectionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loginHref, setLoginHref] = useState("/login");
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<StoredProfile | null>(() =>
    getStoredProfile()
  );
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [postAnonymously, setPostAnonymously] = useState(false);

  const ownerReview = useMemo(
    () => reviews.find((review) => review.isOwner) ?? null,
    [reviews]
  );

  useEffect(() => {
    const updateProfile = () => {
      setProfile(getStoredProfile());
      setToken(getAuthToken());
    };
    window.addEventListener(PROFILE_EVENT, updateProfile);
    window.addEventListener("storage", updateProfile);
    return () => {
      window.removeEventListener(PROFILE_EVENT, updateProfile);
      window.removeEventListener("storage", updateProfile);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchProductReviews(productId, {
      limit: MAX_REVIEWS,
      token: token ?? undefined,
    })
      .then((items) => {
        if (cancelled) return;
        setReviews(items);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't load reviews right now."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productId, token]);

  useEffect(() => {
    if (ownerReview) {
      setRating(ownerReview.rating ?? null);
      setComment(ownerReview.comment);
      setPostAnonymously(ownerReview.isAnonymous);
    } else {
      setRating(null);
      setComment("");
      setPostAnonymously(false);
    }
    setFormMessage(null);
    setFormError(null);
  }, [ownerReview]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!token) {
        setFormError("Please sign in to share your review.");
        return;
      }
      const trimmedComment = comment.trim();
      if (!trimmedComment) {
        setFormError("Please share a few words about your experience.");
        return;
      }
      setSubmitting(true);
      setFormError(null);
      setFormMessage(null);
      try {
        const review = await submitProductReview(
          productId,
          {
            rating,
            comment: trimmedComment,
            isPublic: true,
            anonymous: postAnonymously,
          },
          token
        );
        setReviews((prev) => {
          const filtered = prev.filter((item) => item.id !== review.id);
          return [review, ...filtered];
        });
        setFormMessage("Your review was saved.");
      } catch (err) {
        setFormError(
          err instanceof Error
            ? err.message
            : "We couldn't save your review. Please try again."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [comment, postAnonymously, productId, rating, token]
  );

  const handleDelete = useCallback(async () => {
    if (!token) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFormMessage(null);
    try {
      await deleteProductReview(productId, token);
      setReviews((prev) => prev.filter((review) => !review.isOwner));
      setComment("");
      setRating(null);
      setFormMessage("Your review was removed.");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "We couldn't remove your review. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }, [productId, token]);

  useEffect(() => {
    const search = searchParams?.toString() || "";
    const pathWithQuery = `${pathname}${search ? `?${search}` : ""}`;
    let nextValue = pathWithQuery || "/";
    if (typeof window !== "undefined") {
      nextValue = window.location.pathname + window.location.search + window.location.hash;
    }
    setLoginHref(`/login?redirect=${encodeURIComponent(nextValue)}`);
  }, [pathname, searchParams]);
  const isAuthed = Boolean(profile);

  return (
    <section id="reviews" className="relative h-full space-y-6 overflow-hidden rounded-[24px]">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#1f2d26]/60">
            Community voices
          </p>
          <h2 className="text-2xl font-black text-[#1f2d26] leading-snug">
            Reviews for {productName}
          </h2>
        </div>
        {profile ? (
          <p className="text-sm text-[#1f2d26]/60">
            Signed in as <span className="font-semibold">{profile.username}</span>
          </p>
        ) : null}
      </div>

      <div className="space-y-6 max-h-[720px] overflow-y-auto pr-1 relative">
        <div className="space-y-4 rounded-2xl border-2 border-dashed border-black/25 bg-white/70 p-4 shadow-[0_6px_16px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2">
            <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5 text-[#1f2d26]" />
            <h3 className="text-lg font-bold text-[#1f2d26]">Your review</h3>
          </div>
          {profile ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#1f2d26]/80">
                  Optional star rating
                </p>
                <div className="mt-2 flex gap-2">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1;
                    const isActive = (rating ?? 0) >= value;
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`rounded-full border-2 border-black p-1 transition ${
                          isActive ? "bg-[#fcd34d]" : "bg-white"
                        }`}
                        onClick={() =>
                          setRating((prev) => (prev === value ? null : value))
                        }
                        aria-label={`${value} star${value > 1 ? "s" : ""}`}
                      >
                        <StarIcon
                          className={`h-5 w-5 ${
                            isActive ? "text-black" : "text-[#d1d5db]"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-black/30 bg-white/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1f2d26]">Post anonymously</p>
                  <p className="text-xs text-[#1f2d26]/70">
                    Hide your name on public reviews while keeping feedback visible.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={postAnonymously}
                  onClick={() => setPostAnonymously((prev) => !prev)}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full border-2 border-black transition ${
                    postAnonymously ? "bg-[#0f5132]" : "bg-white"
                  }`}
                >
                  <span className="sr-only">
                    {postAnonymously ? "Anonymous reviews enabled" : "Anonymous reviews disabled"}
                  </span>
                  <span
                    className={`absolute left-1 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-black bg-white transition-transform ${
                      postAnonymously ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#1f2d26]/80">
                  Tell us about your experience
                </label>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="mt-2 h-32 w-full rounded-2xl border-2 border-black bg-white p-3 text-sm text-[#1f2d26] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f2d26]"
                  placeholder="Share results, texture notes, how long you used it, etc."
                />
              </div>
              {formError ? (
                <p className="text-sm font-semibold text-[#b42318]">{formError}</p>
              ) : null}
              {formMessage ? (
                <p className="text-sm font-semibold text-[#15803d]">{formMessage}</p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#1f2d26] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-[0_3px_0_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:bg-[#555] disabled:text-white/70"
                >
                  {submitting ? "Saving…" : ownerReview ? "Update review" : "Post review"}
                </button>
                {ownerReview ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1f2d26] shadow-[0_3px_0_rgba(0,0,0,0.1)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:text-[#999]"
                  >
                    Remove review
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="text-sm text-[#1f2d26]/70">
              Log in to add your voice. Reviews from real members help the
              SkinMatch community understand how products fit different routines.
            </p>
          )}
        </div>
        <div className="space-y-3 rounded-2xl border-2 border-dashed border-black/25 bg-white/70 p-4 shadow-[0_6px_16px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2">
            <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5 text-[#1f2d26]" />
            <h3 className="text-lg font-bold text-[#1f2d26]">Community feedback</h3>
          </div>
          {loading ? (
            <p className="text-sm text-[#1f2d26]/70">Loading reviews…</p>
          ) : error ? (
            <div className="rounded-2xl border-2 border-[#b42318] bg-[#ffe9e6] px-4 py-3 text-sm text-[#5c1c15]">
              {error}
            </div>
          ) : reviews.length ? (
            <ul className="space-y-3">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-[14px] border border-black/10 bg-[#f7f9f5] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-semibold text-[#1f2d26]">
                      {initialsForName(review.userDisplayName)}
                    </div>
                    <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1f2d26]">
                      {review.userDisplayName}
                      {review.isAnonymous ? (
                        <span className="ml-2 rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1f2d26]">
                          Anonymous
                        </span>
                      ) : null}
                      {review.isOwner ? (
                          <span className="ml-2 rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1d4ed8]">
                            You
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[#1f2d26]/60">
                        {formatDate(review.updatedAt)}
                      </p>
                    </div>
                  </div>
                  {typeof review.rating === "number" ? (
                    <div className="mt-2 flex items-center gap-1">
                      {Array.from({ length: review.rating }).map((_, idx) => (
                        <StarIcon key={idx} className="h-4 w-4 text-[#f59e0b]" />
                      ))}
                      <span className="text-xs font-semibold text-[#1f2d26]/70">
                        {review.rating} / 5
                      </span>
                    </div>
                  ) : null}
                  <p className="mt-2 text-sm leading-relaxed text-[#1f2d26]/80">
                    {review.comment}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#1f2d26]/70">
              No reviews yet. Be the first to let the community know how this
              product worked for you.
            </p>
          )}
        </div>
      </div>

      {!isAuthed ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-[1px] px-4">
          <div className="space-y-3 rounded-2xl border-2 border-dashed border-black/15 bg-white px-6 py-7 text-center shadow-[0_10px_24px_rgba(0,0,0,0.08)] max-w-md w-full">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1f2d26]/60">
              Please sign in
            </p>
            <p className="text-lg font-bold text-[#1f2d26]">Sign in to read and share reviews</p>
            <p className="text-sm text-[#1f2d26]/70">
              Log in to view community feedback and add your own experience with this product.
            </p>
            <div className="flex justify-center">
              <Link
                href={loginHref}
                className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#1f2d26] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-[0_3px_0_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5 whitespace-nowrap"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const initialsForName = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "SM";

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
};
