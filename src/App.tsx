import { FormEvent, MouseEvent, ReactNode, useEffect, useRef, useState } from "react";
// @ts-ignore
import { bookableDates, formatPickup, formatShortDate, formatSlotTime, formatWeekday } from "../server/lisbon.js";
// @ts-ignore
import { IMAGE_WIDTHS, srcSet } from "./images.js";

type Product = { id: number; name: string; note: string; price: number; image: string };
type Cart = Record<number, number>;
type Slot = { at: string; full: boolean };
type Line = { id: number; name: string; qty: number; unitPrice: number; lineTotal: number };
type Order = { id: string; name: string; phone: string; email: string; pickupAt: string; lines: Line[]; total: number };

const euro = (cents: number) => "€" + (cents / 100).toFixed(2);

const go = (path: string) => {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

// An ordinary link that navigates inside the app without a page load.
function Link({ href, children, ...rest }: { href: string; children: ReactNode; className?: string; "aria-current"?: "page" }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(href);
  };
  return (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}

// Page heading that takes focus when the page changes, so screen readers announce the new page.
function PageHeading({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <h1 className="h1" tabIndex={-1} ref={ref}>
      {children}
    </h1>
  );
}

const readCart = (): Cart => {
  try {
    return JSON.parse(localStorage.getItem("cart") || "{}");
  } catch {
    return {};
  }
};

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [cart, setCart] = useState<Cart>(readCart);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPop);
    fetch("/api/products").then((r) => r.json()).then(setProducts);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => localStorage.setItem("cart", JSON.stringify(cart)), [cart]);

  const inCart = (products || []).filter((p) => cart[p.id] > 0);
  const count = inCart.reduce((sum, p) => sum + cart[p.id], 0);
  const total = inCart.reduce((sum, p) => sum + p.price * cart[p.id], 0);

  const add = (p: Product) => {
    setCart({ ...cart, [p.id]: (cart[p.id] || 0) + 1 });
    setAnnouncement(`Added ${p.name}. ${count + 1} ${count + 1 === 1 ? "item" : "items"} in your cart.`);
  };

  const showCartBar = count > 0 && path === "/"; // never on checkout, where it would cover Place order
  const orderMatch = path.match(/^\/order\/([A-Za-z0-9_-]{22})$/);
  const page =
    path === "/" ? "menu" : path === "/checkout" ? "checkout" : orderMatch ? "order" : "missing";

  useEffect(() => {
    const titles = { menu: "Crumbwell Bakery", checkout: "Checkout · Crumbwell", order: "Your order · Crumbwell", missing: "Page not found · Crumbwell" };
    document.title = titles[page];
  }, [page]);

  return (
    <>
      <header className="nav">
        <div className="wrap nav-inner">
          <Link className="logo" href="/">
            Crumbwell
          </Link>
          <nav aria-label="Main" className="navlinks">
            <Link className="navlink" href="/" aria-current={page === "menu" ? "page" : undefined}>
              Menu
            </Link>
            <Link className="cart-pill" href="/checkout" aria-current={page === "checkout" ? "page" : undefined}>
              Cart ({count})
            </Link>
          </nav>
        </div>
      </header>

      <main className={showCartBar ? "has-cartbar" : undefined}>
        {page === "menu" && <Menu products={products} add={add} />}
        {page === "checkout" && <Checkout products={products} items={inCart} cart={cart} total={total} onDone={() => setCart({})} />}
        {page === "order" && <OrderPage key={orderMatch![1]} id={orderMatch![1]} />}
        {page === "missing" && (
          <div className="wrap page">
            <PageHeading>Page not found</PageHeading>
            <p>
              <Link href="/">Go to the menu</Link>
            </p>
          </div>
        )}

        {showCartBar && (
          <div className="cartbar">
            <p>
              {count} {count === 1 ? "item" : "items"} · {euro(total)}
            </p>
            <Link className="cartbtn" href="/checkout">
              View cart
            </Link>
          </div>
        )}
        <p className="visually-hidden" role="status">
          {announcement}
        </p>
      </main>
    </>
  );
}

function Menu({ products, add }: { products: Product[] | null; add: (p: Product) => void }) {
  return (
    <>
      <div className="wrap">
        <div className="hero">
          <img
            src="/img/hero-1200.webp"
            srcSet={srcSet("hero", IMAGE_WIDTHS.hero)}
            sizes="(max-width: 1264px) calc(100vw - 32px), 1200px"
            width={1200}
            height={801}
            fetchPriority="high"
            alt=""
          />
          <div className="hero-text">
            <PageHeading>Baked this morning.</PageHeading>
            <p className="sub">Order ahead and pick up warm from our Lisbon counter.</p>
          </div>
        </div>
        <h2 className="section-title">Today's bakes</h2>
        {!products && <p role="status">Loading the menu…</p>}
        <ul className="grid">
          {(products || []).map((p) => (
            <li className="card" key={p.id}>
              <img
                src={`/img/${p.image}-400.webp`}
                srcSet={srcSet(p.image, IMAGE_WIDTHS.product)}
                sizes="(max-width: 599px) calc(100vw - 32px), (max-width: 899px) 50vw, 300px"
                width={400}
                height={267}
                loading="lazy"
                decoding="async"
                alt=""
              />
              <div className="card-body">
                <h3 className="card-title">{p.name}</h3>
                <p className="muted">{p.note}</p>
                <div className="row">
                  <p className="price">{euro(p.price)}</p>
                  <button type="button" className="add" onClick={() => add(p)}>
                    <span aria-hidden="true">+ </span>Add<span className="visually-hidden"> {p.name}</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <footer className="footer">
        <p>Crumbwell Bakery · Rua do Forno 12, Lisbon · Open every day 8:00–18:00</p>
        <p className="credits">
          Photos from Unsplash: Yeh Xintong, David Todd McCarty, Conor Brown, Nick Fewings, Kamilla Isalieva, Iñigo De la Maza, Aneta
          Voborilova
        </p>
      </footer>
    </>
  );
}

type FieldKey = "name" | "phone" | "email";
type ErrorKey = FieldKey | "slot";
type Errors = Partial<Record<ErrorKey, string>>;

const FIELDS: { key: FieldKey; label: string; hint?: string; type: string; autoComplete: string }[] = [
  { key: "name", label: "Full name", type: "text", autoComplete: "name" },
  { key: "phone", label: "Phone", hint: "We'll text you when your order is ready.", type: "tel", autoComplete: "tel" },
  { key: "email", label: "Email", hint: "For your receipt.", type: "email", autoComplete: "email" },
];
const SUMMARY_LABELS: Record<ErrorKey, string> = { name: "Full name", phone: "Phone number", email: "Email address", slot: "Pickup time" };
const COUNT_WORDS = ["", "One thing", "Two things", "Three things", "Four things"];

function fieldError(key: FieldKey, value: string): string | undefined {
  const v = value.trim();
  if (key === "name" && !v) return "Enter your full name.";
  if (key === "phone") {
    if (!v) return "Enter a phone number so we can text you when your order is ready.";
    if ((v.match(/\d/g) || []).length < 7 || !/^\+?[\d\s().-]+$/.test(v)) return "Enter a phone number with at least 7 digits, like +351 912 345 678.";
  }
  if (key === "email") {
    if (!v) return "Enter an email address for your receipt.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter an email address like name@example.com.";
  }
  return undefined;
}

function Checkout({ products, items, cart, total, onDone }: { products: Product[] | null; items: Product[]; cart: Cart; total: number; onDone: () => void }) {
  const [form, setForm] = useState<Record<FieldKey, string>>({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [dates] = useState<string[]>(() => bookableDates());
  const [day, setDay] = useState(0);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsFailed, setSlotsFailed] = useState(false);
  const [slot, setSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [reload, setReload] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setSlots(null);
    setSlotsFailed(false);
    fetch("/api/slots?date=" + dates[day])
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((s) => live && setSlots(s))
      .catch(() => live && setSlotsFailed(true));
    return () => {
      live = false;
    };
  }, [dates, day, reload]);

  if (!products) {
    return (
      <div className="wrap page">
        <PageHeading>Checkout</PageHeading>
        <p role="status">Loading your order…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="wrap page">
        <PageHeading>Checkout</PageHeading>
        <p className="lede">Your cart is empty.</p>
        <p>
          <Link href="/">Choose something from the menu</Link>
        </p>
      </div>
    );
  }

  const update = (key: FieldKey, value: string) => {
    setForm({ ...form, [key]: value });
    // Once a field has an error, keep its message up to date as the customer fixes it.
    if (errors[key]) setErrors({ ...errors, [key]: fieldError(key, value) });
  };

  const chooseSlot = (at: string) => {
    setSlot(at);
    if (errors.slot) setErrors({ ...errors, slot: undefined });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError("");
    const found: Errors = {};
    for (const f of FIELDS) found[f.key] = fieldError(f.key, form[f.key]);
    if (!slot) found.slot = "Choose a pickup time.";
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, items: items.map((p) => ({ id: p.id, qty: cart[p.id] })), pickupAt: slot }),
      });
      const body = await res.json();
      if (!res.ok) {
        setServerError(body.error || "Something went wrong. Please try again.");
        if (/pickup time/i.test(body.error || "")) {
          setSlot("");
          setReload((n) => n + 1);
        }
        return;
      }
      onDone();
      go("/order/" + body.id);
    } catch {
      setServerError("We couldn't reach the bakery. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const errorKeys = (Object.keys(SUMMARY_LABELS) as ErrorKey[]).filter((k) => errors[k]);
  const describedBy = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;
  const dayLabel = (i: number) => (i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatWeekday(dates[i]));

  return (
    <div className="wrap page checkout">
      <PageHeading>Checkout</PageHeading>
      <p className="lede">Pick up at Rua do Forno 12, Lisbon. Open every day 8:00–18:00.</p>

      {errorKeys.length > 0 && (
        <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef} aria-labelledby="error-summary-title">
          <p id="error-summary-title">{COUNT_WORDS[errorKeys.length]} to fix before you order:</p>
          <ul>
            {errorKeys.map((k) => (
              <li key={k}>
                <a href={k === "slot" ? "#pickup-time" : "#field-" + k} onClick={(e) => focusField(e, k)}>
                  {SUMMARY_LABELS[k]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="checkout-grid" onSubmit={submit} noValidate>
        <div className="checkout-main">
          <section className="card-box" aria-labelledby="details-heading">
            <h2 className="h2" id="details-heading">
              Your details
            </h2>
            {FIELDS.map((f) => {
              const error = errors[f.key];
              return (
                <div className={error ? "field has-error" : "field"} key={f.key}>
                  <label htmlFor={"field-" + f.key}>{f.label}</label>
                  {f.hint && (
                    <p className="hint" id={"hint-" + f.key}>
                      {f.hint}
                    </p>
                  )}
                  <input
                    id={"field-" + f.key}
                    className="input"
                    type={f.type}
                    autoComplete={f.autoComplete}
                    required
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy(f.hint && "hint-" + f.key, error && "error-" + f.key)}
                    value={form[f.key]}
                    onChange={(ev) => update(f.key, ev.target.value)}
                  />
                  {error && <ErrorMessage id={"error-" + f.key}>{error}</ErrorMessage>}
                </div>
              );
            })}
          </section>

          <section className="card-box" aria-labelledby="pickup-heading">
            <div className="card-head">
              <h2 className="h2" id="pickup-heading">
                Pickup time
              </h2>
              <p className="badge">All times Lisbon time</p>
            </div>

            <fieldset className="choices">
              <legend>Day</legend>
              <div className="days">
                {dates.map((d, i) => (
                  <label className="option day" key={d}>
                    <input
                      type="radio"
                      name="day"
                      value={d}
                      checked={day === i}
                      onChange={() => {
                        setDay(i);
                        setSlot("");
                      }}
                    />
                    <span className="face">
                      <span className="day-name">{dayLabel(i)}</span>
                      <span className="day-date">{formatShortDate(d)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="choices" id="pickup-time" tabIndex={-1} aria-describedby={describedBy(errors.slot && "error-slot")}>
              <legend className={errors.slot ? "has-error" : undefined}>Time</legend>
              {!slots && !slotsFailed && <p role="status">Loading pickup times…</p>}
              {slotsFailed && (
                <p className="field-error" role="alert">
                  We couldn't load pickup times.{" "}
                  <button type="button" className="text-button" onClick={() => setReload((n) => n + 1)}>
                    Try again
                  </button>
                </p>
              )}
              {slots && slots.length === 0 && <p>No pickup times are left {day === 0 ? "today" : "on this day"}. Please choose another day.</p>}
              {slots && slots.length > 0 && (
                <div className="slots">
                  {slots.map((s) => (
                    <label className="option slot" key={s.at}>
                      <input type="radio" name="slot" value={s.at} checked={slot === s.at} disabled={s.full} onChange={() => chooseSlot(s.at)} />
                      <span className="face">
                        {formatSlotTime(s.at)}
                        {s.full && " · Full"}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {errors.slot && <ErrorMessage id="error-slot">{errors.slot}</ErrorMessage>}
            </fieldset>
            <p className="pickup-summary" aria-live="polite">
              {slot && `Pickup: ${formatPickup(slot)}`}
            </p>
          </section>
        </div>

        <section className="card-box summary" aria-labelledby="order-heading">
          <h2 className="h2" id="order-heading">
            Your order
          </h2>
          <ul className="lines">
            {items.map((p) => (
              <li key={p.id}>
                <span>
                  {cart[p.id]} × {p.name}
                </span>
                <span>{euro(p.price * cart[p.id])}</span>
              </li>
            ))}
          </ul>
          <div className="place">
            <p className="total">
              <span>Total</span>
              <span className="total-value">{euro(total)}</span>
            </p>
            <button type="submit" className="pay" disabled={submitting}>
              {submitting ? "Placing order…" : "Place order"}
              <span className="pay-price"> · {euro(total)}</span>
            </button>
            {serverError && (
              <p className="server-error" role="alert">
                We couldn't place your order. {serverError}
              </p>
            )}
          </div>
          <p className="note">You pay at the counter when you collect. Prices are checked by the bakery.</p>
        </section>
      </form>
    </div>
  );
}

// Error summary links move focus to the field itself, or to the first open pickup time.
function focusField(e: MouseEvent<HTMLAnchorElement>, key: ErrorKey) {
  e.preventDefault();
  const target =
    key === "slot"
      ? document.querySelector<HTMLElement>('#pickup-time input:not(:disabled)') || document.getElementById("pickup-time")
      : document.getElementById("field-" + key);
  target?.focus();
  target?.scrollIntoView({ block: "center" });
}

function ErrorMessage({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="field-error" id={id}>
      <span className="error-icon" aria-hidden="true">
        !
      </span>
      <span>{children}</span>
    </p>
  );
}

function OrderPage({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch("/api/orders/" + id)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setOrder)
      .catch(() => setMissing(true));
  }, [id]);

  if (missing) {
    return (
      <div className="wrap page">
        <PageHeading>We couldn't find that order</PageHeading>
        <p className="lede">Check the link, or call the bakery and we'll look it up.</p>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="wrap page">
        <p role="status">Loading your order…</p>
      </div>
    );
  }

  return (
    <div className="wrap page order">
      <PageHeading>Thanks, {order.name}!</PageHeading>
      <p className="lede">We'll text {order.phone} when it's ready. Keep this page's link to check your order.</p>
      <section className="card-box">
        <h2 className="h2">Pickup</h2>
        <p>{formatPickup(order.pickupAt)}</p>
        <p className="muted">Rua do Forno 12, Lisbon</p>
      </section>
      <section className="card-box">
        <h2 className="h2">Items</h2>
        <ul className="lines">
          {order.lines.map((l) => (
            <li key={l.id}>
              <span>
                {l.qty} × {l.name}
              </span>
              <span>{euro(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <p className="total">
          <span>To pay at pickup</span>
          <span>{euro(order.total)}</span>
        </p>
      </section>
    </div>
  );
}
