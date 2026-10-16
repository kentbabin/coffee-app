"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { VoteControl, type Vote } from "@/components/ui";
import { publicDb } from "@/lib/supabase/public";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

// P5. Visitors don't sign in, so a vote is tied to a random token kept in this
// browser (plus a hashed IP on the server). Votes cast here are remembered
// here, so the visitor's own thumbs stay highlighted.

const TOKEN_KEY = "coffee.voter-token";
const VOTES_KEY = "coffee.votes";
const CHANGED = "coffee:votes-changed";

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function voterToken() {
  const store = storage();
  let token = store?.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    store?.setItem(TOKEN_KEY, token);
  }
  return token;
}

function readVotes(): Record<string, 1 | -1> {
  try {
    return JSON.parse(storage()?.getItem(VOTES_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function remember(shopId: string, value: Vote) {
  const votes = readVotes();
  if (value === 0) delete votes[shopId];
  else votes[shopId] = value;
  try {
    storage()?.setItem(VOTES_KEY, JSON.stringify(votes));
  } catch {
    // Storage full or blocked: the vote still counts, it just isn't highlighted next visit.
  }
  window.dispatchEvent(new Event(CHANGED));
}

// The same shop can be on screen twice (card and page); both follow the store.
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function useStoredVote(shopId: string): Vote {
  return useSyncExternalStore(
    subscribe,
    () => readVotes()[shopId] ?? 0,
    () => 0,
  );
}

// Lists are cached for a minute, so counts on screen may predate this
// visitor's own vote. Shops they voted on get fresh counts, one query per batch.
let queue: { id: string; resolve: (c: { up: number; down: number } | null) => void }[] = [];
function freshCounts(id: string) {
  return new Promise<{ up: number; down: number } | null>((resolve) => {
    queue.push({ id, resolve });
    if (queue.length > 1) return;
    queueMicrotask(async () => {
      const batch = queue;
      queue = [];
      const { data } = await publicDb.from("shops").select("id, upvotes, downvotes").in("id", batch.map((b) => b.id));
      const byId = new Map((data ?? []).map((r) => [r.id, { up: r.upvotes, down: r.downvotes }]));
      for (const b of batch) b.resolve(byId.get(b.id) ?? null);
    });
  });
}

export function ShopVote({
  shopId,
  up,
  down,
  name,
  alwaysFresh = false,
}: {
  shopId: string;
  up: number;
  down: number;
  name: string;
  /** Fetch current counts even without a vote here: for the one-shop page. */
  alwaysFresh?: boolean;
}) {
  const stored = useStoredVote(shopId);
  // While a vote is in flight, show it instead of the stored one.
  const [inFlight, setInFlight] = useState<Vote | null>(null);
  // Counts newer than the cached page: from a fresh read or a vote reply.
  const [counts, setCounts] = useState<{ up: number; down: number } | null>(null);
  const [message, setMessage] = useState("");

  const value = inFlight ?? stored;
  const shown = counts ?? { up, down };

  useEffect(() => {
    if (!stored && !alwaysFresh) return;
    let live = true;
    freshCounts(shopId).then((c) => {
      if (live && c) setCounts(c);
    });
    return () => {
      live = false;
    };
  }, [shopId, stored, alwaysFresh]);

  async function cast(next: Vote) {
    const before = { value, ...shown };
    setInFlight(next);
    // Optimistic: take off the old vote, add the new one.
    setCounts({
      up: before.up - (before.value === 1 ? 1 : 0) + (next === 1 ? 1 : 0),
      down: before.down - (before.value === -1 ? 1 : 0) + (next === -1 ? 1 : 0),
    });
    setMessage("");
    // Remember it now, so leaving the page mid-request can't lose it.
    remember(shopId, next);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: supabasePublishableKey },
        body: JSON.stringify({ shop_id: shopId, voter_token: voterToken(), value: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Your vote wasn't saved. Try again.");
      remember(shopId, body.value);
      setCounts({ up: body.up, down: body.down });
    } catch (e) {
      remember(shopId, before.value);
      setCounts({ up: before.up, down: before.down });
      setMessage(e instanceof Error ? e.message : "Your vote wasn't saved. Try again.");
    } finally {
      setInFlight(null);
    }
  }

  return (
    <div className="vote">
      <VoteControl up={shown.up} down={shown.down} value={value} onVote={cast} disabled={inFlight !== null} />
      <p className="vote-msg" role="status" aria-live="polite">
        {message ? <span className="visually-hidden">{name}: </span> : null}
        {message}
      </p>
    </div>
  );
}
