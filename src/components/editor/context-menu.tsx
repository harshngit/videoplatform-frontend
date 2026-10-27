"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronRight } from "lucide-react";

export type MenuItem =
  | "divider"
  | {
      label: string; icon?: React.ElementType; shortcut?: string; danger?: boolean; disabled?: boolean; checked?: boolean;
      onClick?: () => void; children?: MenuItem[];
    };

export type MenuState = { x: number; y: number; items: MenuItem[] } | null;

/** Right-click menu with optional submenus. Closes on outside click, Escape, scroll or resize. */
export function ContextMenu({ menu, onClose }: { menu: MenuState; onClose: () => void }) {
  useEffect(() => {
    if (!menu) return;
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("pointerdown", close);
    window.addEventListener("resize", close);
    window.addEventListener("wheel", close, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("wheel", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu, onClose]);
  if (!menu) return null;
  return <MenuPanel items={menu.items} x={menu.x} y={menu.y} onClose={onClose} />;
}

function MenuPanel({ items, x, y, onClose }: { items: MenuItem[]; x: number; y: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [open, setOpen] = useState<number | null>(null);

  // Keep the menu inside the window.
  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ x: Math.min(x, window.innerWidth - r.width - 8), y: Math.min(y, window.innerHeight - r.height - 8) });
  }, [x, y]);

  return (
    <div ref={ref} role="menu" onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}
      className="shadow-card fixed z-[60] min-w-52 rounded-xl border border-line bg-white p-1 text-sm" style={{ left: pos.x, top: pos.y }}>
      {items.map((it, i) => {
        if (it === "divider") return <div key={i} className="my-1 h-px bg-line" />;
        const Icon = it.icon;
        return (
          <div key={i} className="relative" onMouseEnter={() => setOpen(it.children ? i : null)}>
            <button role="menuitem" disabled={it.disabled}
              onClick={() => { if (it.children) { setOpen(i); return; } it.onClick?.(); onClose(); }}
              className={clsx("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition disabled:cursor-default disabled:opacity-40",
                it.danger ? "text-red-600 hover:bg-red-50" : "hover:bg-surface-2", open === i && "bg-surface-2")}>
              <span className="grid size-4 place-items-center">{it.checked ? <Check className="size-3.5 text-brand" /> : Icon ? <Icon className="size-4 text-muted" /> : null}</span>
              <span className="flex-1">{it.label}</span>
              {it.shortcut && <span className="text-xs text-muted">{it.shortcut}</span>}
              {it.children && <ChevronRight className="size-3.5 text-muted" />}
            </button>
            {it.children && open === i && (
              <SubPanel items={it.children} onClose={onClose} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SubPanel({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(true);
  const [shiftUp, setShiftUp] = useState(0);
  // Open to the left / shift up when the submenu would leave the window.
  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    if (r.right > window.innerWidth - 8) setLeft(false);
    if (r.bottom > window.innerHeight - 8) setShiftUp(r.bottom - window.innerHeight + 8);
  }, []);
  return (
    <div ref={ref} className={clsx("absolute", left ? "left-full pl-1" : "right-full pr-1")} style={{ top: -shiftUp }}>
      <div className="shadow-card min-w-44 rounded-xl border border-line bg-white p-1">
        {items.map((it, i) => it === "divider" ? <div key={i} className="my-1 h-px bg-line" /> : (
          <button key={i} role="menuitem" disabled={it.disabled} onClick={() => { it.onClick?.(); onClose(); }}
            className={clsx("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-surface-2 disabled:opacity-40", it.danger && "text-red-600")}>
            <span className="grid size-4 place-items-center">{it.checked && <Check className="size-3.5 text-brand" />}</span>
            <span className="flex-1">{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
