"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useAnimationFrame,
  useReducedMotion,
} from "motion/react";
import { ArrowRight, X } from "lucide-react";
import { picsumFallback, type MomentCard } from "@/lib/moments";

const LOOP = 2; // set diduplikasi → drag tak terasa ujungnya

/* Acak deterministik dari hash id — murni (aman hydration & lint purity). */
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffleStable<T extends { id: string }>(arr: T[]): T[] {
  return [...arr]
    .map((item) => ({ item, h: hashId(item.id) }))
    .sort((a, b) => a.h - b.h)
    .map((x) => x.item);
}

type RopeMomentsProps = {
  items: MomentCard[];
};

/* ─── kartu polaroid di tali ──────────────────────────────────── */
function RopeCard({
  item,
  i,
  layoutKey,
  onOpen,
}: {
  item: MomentCard;
  i: number;
  layoutKey: string;
  onOpen: (item: MomentCard, layoutKey: string) => void;
}) {
  const reduce = useReducedMotion();
  const rot = (((i * 0.618) % 1) - 0.5) * 5; // kemiringan golden-ratio

  return (
    <motion.button
      type="button"
      initial={reduce ? false : { opacity: 0, y: 26 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: (i % 12) * 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onOpen(item, layoutKey)}
      className="group relative w-[210px] shrink-0 cursor-pointer text-left outline-none focus-visible:outline-2 focus-visible:outline-dusty-blue md:w-[240px]"
      aria-label={`Momen ${item.title}`}
    >
      <div
        style={{ transform: `rotate(${rot}deg)` }}
        className="transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:[transform:rotate(0deg)_translateY(-10px)] motion-reduce:transition-none"
      >
        {/* jepitan menggenggam tali (-47px = posisi tali) */}
        <span
          aria-hidden
          className="absolute left-1/2 top-[-47px] z-10 h-[26px] w-[18px] -translate-x-1/2 rounded-[5px]
                     shadow-[0_3px_8px_rgba(61,58,54,0.25),inset_0_1px_0_rgba(255,255,255,0.4)]
                     transition-transform duration-300 group-hover:-translate-y-1"
          style={{
            background:
              "linear-gradient(to bottom, var(--color-accent-secondary), var(--color-accent))",
          }}
        />
        {/* benang dari klip ke kartu */}
        <span
          aria-hidden
          className="absolute left-1/2 top-[-21px] h-[21px] w-[1.5px] -translate-x-1/2"
          style={{
            background:
              "linear-gradient(to bottom, color-mix(in srgb, var(--color-accent) 70%, transparent), color-mix(in srgb, var(--color-accent) 20%, transparent))",
          }}
        />
        <motion.div
          layoutId={layoutKey}
          className="rounded-md bg-bg-card p-2 pb-3 shadow-card"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- objek publik statis */}
          <img
            src={item.url}
            alt={`Momen ${item.title}`}
            width={640}
            height={480}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.fb) {
                img.dataset.fb = "1";
                img.src = picsumFallback(item.id);
              }
            }}
            className="aspect-[4/3] w-full rounded-[3px] bg-bg-warm object-cover"
          />
        </motion.div>
        <div className="mt-3 px-0.5">
          <p className="font-display text-sm font-semibold text-text-primary">
            {item.title}
          </p>
          {item.caption && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">
              “{item.caption}”
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ─── overlay detail momen ────────────────────────────────────── */
function MomentOverlay({
  item,
  layoutKey,
  onClose,
}: {
  item: MomentCard;
  layoutKey: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-text-primary/70 backdrop-blur-md"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Momen ${item.title}`}
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-bg-card p-5 shadow-card sm:p-7"
        initial={{ scale: 0.96, y: 14 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 14, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-border bg-bg-base/80 text-text-primary transition-colors hover:border-accent"
        >
          <X size={16} />
        </button>

        <motion.div
          layoutId={layoutKey}
          className="rounded-lg bg-bg-warm p-2 shadow-soft"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- objek publik statis */}
          <img
            src={item.url}
            alt={`Momen ${item.title}`}
            width={640}
            height={480}
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.fb) {
                img.dataset.fb = "1";
                img.src = picsumFallback(item.id);
              }
            }}
            className="aspect-[4/3] w-full rounded-md object-cover"
          />
        </motion.div>

        <div className="mt-5 space-y-2 px-1">
          <p className="font-display text-2xl text-text-primary">{item.title}</p>
          {item.caption && (
            <blockquote className="text-sm italic leading-relaxed text-text-secondary">
              “{item.caption}” —{" "}
              <span className="not-italic">Keep it close. Keep it TEMORA.</span>
            </blockquote>
          )}
          <Link
            href="/moments"
            onClick={onClose}
            className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Lihat semua momen <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── section tali momen di landing ───────────────────────────── */
export function RopeMoments({ items }: RopeMomentsProps) {
  const [active, setActive] = useState<{ item: MomentCard; layoutKey: string } | null>(
    null,
  );

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const offset = useMotionValue(0);
  const trackX = useTransform(offset, (v) => -v);
  const [halfMax, setHalfMax] = useState(0); // lebar satu set → titik wrap
  const [ropeW, setRopeW] = useState(0);
  const reduce = useReducedMotion();

  const drag = useRef({ dragging: false, lastX: 0, lastT: 0, vel: 0, moved: 0 });

  const cards = useMemo(() => shuffleStable(items), [items]);
  const loopItems = [...cards, ...cards];

  const wrap = useCallback(
    (v: number) => {
      if (halfMax <= 0) return 0;
      let x = v % halfMax;
      if (x < 0) x += halfMax;
      return x;
    },
    [halfMax],
  );

  useLayoutEffect(() => {
    const measure = () => {
      const tr = trackRef.current;
      if (!tr) return;
      const pad = 32;
      setHalfMax(Math.max(0, (tr.scrollWidth - pad) / LOOP));
      setRopeW(tr.scrollWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [cards]);

  useAnimationFrame((_, delta) => {
    if (reduce) return; // reduced-motion: tanpa inersia (design-system §5)
    const d = drag.current;
    if (d.dragging) return;
    if (Math.abs(d.vel) < 0.25) {
      d.vel = 0;
      return;
    }
    const dt = Math.min(delta, 50) / 1000;
    offset.set(wrap(offset.get() + d.vel * dt));
    d.vel *= 0.94;
  });

  const handleOpen = (item: MomentCard, layoutKey: string) => {
    if (drag.current.moved > 6) return; // itu drag, bukan klik
    setActive({ item, layoutKey });
  };

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const d = drag.current;

    const onPointerDown = (e: PointerEvent) => {
      d.dragging = true;
      d.lastX = e.clientX;
      d.lastT = performance.now();
      d.vel = 0;
      d.moved = 0;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!d.dragging) return;
      const dx = e.clientX - d.lastX;
      d.moved += Math.abs(dx);
      const now = performance.now();
      const dt = Math.max(8, now - d.lastT) / 1000;
      d.vel = d.vel * 0.6 + (-dx / dt) * 0.4;
      offset.set(wrap(offset.get() - dx));
      d.lastX = e.clientX;
      d.lastT = now;
    };
    const endDrag = () => {
      if (!d.dragging) return;
      d.dragging = false;
      if (reduce) d.vel = 0;
    };
    const onWheel = (e: WheelEvent) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!dx || reduce) return;
      e.preventDefault();
      offset.set(wrap(offset.get() + dx));
    };

    vp.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      vp.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      vp.removeEventListener("wheel", onWheel);
    };
  }, [wrap, offset, reduce]);

  return (
    <section className="overflow-hidden bg-bg-warm py-20 md:py-28" aria-label="Momen pilihan TEMORA">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 30 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end"
        >
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">
              Momen Pilihan
            </p>
            <h2 className="font-display text-3xl tracking-tight text-text-primary md:text-5xl">
              Keep the moments close.
            </h2>
          </div>
          <Link
            href="/moments"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Lihat semua momen <ArrowRight size={15} aria-hidden />
          </Link>
        </motion.div>

        <div
          ref={viewportRef}
          className="relative cursor-grab select-none overflow-x-hidden active:cursor-grabbing"
          style={{ touchAction: "pan-y" }}
        >
          <motion.div
            ref={trackRef}
            style={{ x: trackX }}
            className="relative flex w-max items-start gap-10 px-4 pb-4 pt-10 md:gap-12"
          >
            {ropeW > 0 && (
              <svg
                aria-hidden
                className="pointer-events-none absolute left-0 top-1.5"
                width={ropeW}
                height={120}
                viewBox={`0 0 ${ropeW} 120`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="temora-rope" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.25" />
                    <stop offset="0.5" stopColor="var(--color-accent-secondary)" stopOpacity="0.9" />
                    <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0.25" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 0 6 L ${ropeW} 6`}
                  fill="none"
                  stroke="url(#temora-rope)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {loopItems.map((item, i) => (
              <RopeCard
                key={`${item.id}-${i}`}
                item={item}
                i={i}
                layoutKey={`moment-${item.id}-${i}`}
                onOpen={handleOpen}
              />
            ))}

            {loopItems.length === 0 && (
              <p className="py-8 text-sm text-text-secondary">
                Kurasi momen sedang disiapkan tim TEMORA.
              </p>
            )}
          </motion.div>
        </div>

        <p className="mt-2 text-center text-xs text-text-secondary">
          Geser talinya & klik foto untuk membaca ceritanya.
        </p>
      </div>

      <AnimatePresence>
        {active && (
          <MomentOverlay
            item={active.item}
            layoutKey={active.layoutKey}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
