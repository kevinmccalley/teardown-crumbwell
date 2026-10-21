import { useEffect, useState } from "react";

const go = (path: string) => {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any>(JSON.parse(localStorage.getItem("cart") || "{}"));

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    fetch("/api/products").then((r) => r.json()).then(setProducts);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => localStorage.setItem("cart", JSON.stringify(cart)), [cart]);

  const add = (id: number) => setCart({ ...cart, [id]: (cart[id] || 0) + 1 });
  const count = Object.values(cart).reduce((a: any, b: any) => a + b, 0) as number;
  const total = products.reduce((sum, p) => sum + p.price * (cart[p.id] || 0), 0);

  const orderMatch = path.match(/^\/order\/(\d+)/);

  return (
    <div>
      <div className="nav">
        <div className="logo" onClick={() => go("/")}>Crumbwell</div>
        <div className="navlinks">
          <div className="navlink" onClick={() => go("/")}>Menu</div>
          <div className="navlink" onClick={() => go("/checkout")}>Cart ({count})</div>
        </div>
      </div>

      {path === "/" && <Menu products={products} add={add} />}
      {path === "/checkout" && <Checkout products={products} cart={cart} total={total} onDone={() => setCart({})} />}
      {orderMatch && <Order id={orderMatch[1]} products={products} />}

      {count > 0 && (
        <div className="cartbar">
          <div>{count} items · €{total.toFixed(2)}</div>
          <div className="cartbtn" onClick={() => go("/checkout")}>View cart</div>
        </div>
      )}

    </div>
  );
}

function Menu({ products, add }: any) {
  return (
    <>
      <div className="hero">
        <img src="/img/hero.jpg" />
        <div className="hero-text">
          <div className="h1">Baked this morning.</div>
          <div className="sub">Order ahead and pick up warm from our Lisbon counter.</div>
        </div>
      </div>
      <div className="section-title">Today's bakes</div>
      <div className="grid">
        {products.map((p: any) => (
          <div className="card" key={p.id}>
            <img src={p.image} />
            <div className="card-body">
              <div className="card-title">{p.name}</div>
              <div className="muted">{p.note}</div>
              <div className="row">
                <div className="price">€{p.price.toFixed(2)}</div>
                <div className="add" onClick={() => add(p.id)}>+ Add</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="footer">Crumbwell Bakery · Rua do Forno 12, Lisbon · Open every day 8:00–18:00</div>
      <div className="credits">Photos from Unsplash: Yeh Xintong, David Todd McCarty, Conor Brown, Nick Fewings, Kamilla Isalieva, Iñigo De la Maza, Aneta Voborilova</div>
    </>
  );
}

function Checkout({ products, cart, total, onDone }: any) {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [day, setDay] = useState(0);
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [errors, setErrors] = useState<any>({});

  const date = new Date();
  date.setDate(date.getDate() + day);
  const dateStr = date.toISOString().slice(0, 10);

  useEffect(() => {
    fetch("/api/slots?date=" + dateStr).then((r) => r.json()).then(setSlots);
  }, [dateStr]);

  const items = products.filter((p: any) => cart[p.id]);

  const submit = async () => {
    const e: any = {};
    if (!form.name) e.name = true;
    if (!form.phone) e.phone = true;
    if (!form.email) e.email = true;
    if (!slot) e.slot = true;
    setErrors(e);
    if (Object.keys(e).length) return;
    const res = await fetch("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        items: items.map((p: any) => ({ id: p.id, qty: cart[p.id] })),
        pickupAt: slot,
        total,
      }),
    });
    const order = await res.json();
    onDone();
    go("/order/" + order.id);
  };

  const days = ["Today", "Tomorrow", "In 2 days"];
  const fields = [
    { key: "name", placeholder: "Full name" },
    { key: "phone", placeholder: "Phone" },
    { key: "email", placeholder: "Email" },
  ];

  return (
    <div className="page">
      <div className="h2">Your order</div>
      {items.map((p: any) => (
        <div className="line" key={p.id}>
          <div>{cart[p.id]} × {p.name}</div>
          <div>€{(p.price * cart[p.id]).toFixed(2)}</div>
        </div>
      ))}
      <div className="line total">
        <div>Total</div>
        <div>€{total.toFixed(2)}</div>
      </div>

      <div className="h3">Your details</div>
      {fields.map((f) => (
        <input
          key={f.key}
          className={errors[f.key] ? "input error" : "input"}
          placeholder={f.placeholder}
          value={(form as any)[f.key]}
          onChange={(ev) => setForm({ ...form, [f.key]: ev.target.value })}
        />
      ))}

      <div className="h3">Pickup time</div>
      <div className="days">
        {days.map((d, i) => (
          <div key={d} className={day === i ? "chip active" : "chip"} onClick={() => { setDay(i); setSlot(""); }}>
            {d}
          </div>
        ))}
      </div>
      <div className={errors.slot ? "slots error" : "slots"}>
        {slots.map((s) => (
          <div key={s} className={slot === s ? "slot active" : "slot"} onClick={() => setSlot(s)}>
            {new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        ))}
      </div>

      <div className="pay" onClick={submit}>Place order · €{total.toFixed(2)}</div>
    </div>
  );
}

function Order({ id, products }: any) {
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    fetch("/api/orders/" + id).then((r) => r.json()).then(setOrder);
  }, [id]);

  if (!order) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div className="h2">Thanks, {order.name}!</div>
      <div className="muted">Order #{order.id} · we'll text {order.phone} when it's ready.</div>
      <div className="h3">Pickup</div>
      <div>{new Date(order.pickupAt).toLocaleString([], { weekday: "long", hour: "2-digit", minute: "2-digit" })}</div>
      <div className="h3">Items</div>
      {order.items.map((i: any) => (
        <div className="line" key={i.id}>
          <div>{i.qty} × {products.find((p: any) => p.id === i.id)?.name}</div>
        </div>
      ))}
      <div className="line total">
        <div>Paid</div>
        <div>€{Number(order.paid).toFixed(2)}</div>
      </div>
    </div>
  );
}
