// Pickup times in the shop's time zone. Shared by the server and the browser, and never uses the
// computer's own time zone, so slots are right across clock changes and for customers anywhere.
export const TIME_ZONE = "Europe/Lisbon";
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 18;
export const BOOKABLE_DAYS = 3;

const partsFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function lisbonParts(instant) {
  const p = {};
  for (const { type, value } of partsFormat.formatToParts(instant)) p[type] = Number(value);
  return p;
}

// Milliseconds Lisbon is ahead of UTC at a given instant (0 in winter, one hour in summer).
function offsetAt(ms) {
  const p = lisbonParts(new Date(ms));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

const splitDate = (date) => date.split("-").map(Number);

// The UTC instant of a Lisbon wall-clock hour on a Lisbon date ("2026-10-25", 8).
export function lisbonTime(date, hour) {
  const [y, m, d] = splitDate(date);
  const wall = Date.UTC(y, m - 1, d, hour);
  const first = wall - offsetAt(wall);
  return new Date(wall - offsetAt(first));
}

export const slotTimes = (date) => {
  const slots = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) slots.push(lisbonTime(date, h).toISOString());
  return slots;
};

const pad = (n) => String(n).padStart(2, "0");

// The Lisbon calendar date ("2026-10-25") at an instant.
export function lisbonDate(instant = new Date()) {
  const p = lisbonParts(instant);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function addDays(date, days) {
  const [y, m, d] = splitDate(date);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isDate(date) {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && addDays(date, 0) === date;
}

// Today and the next days in Lisbon, as dates that can be booked.
export function bookableDates(now = new Date()) {
  const today = lisbonDate(now);
  return Array.from({ length: BOOKABLE_DAYS }, (_, i) => addDays(today, i));
}

// Formatting a calendar date: noon UTC is the same day everywhere, so format it in UTC.
const dateFormat = (options) => {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options });
  return (date) => {
    const [y, m, d] = splitDate(date);
    return f.format(new Date(Date.UTC(y, m - 1, d, 12)));
  };
};

export const formatWeekday = dateFormat({ weekday: "long" }); // "Saturday"
export const formatShortDate = dateFormat({ weekday: "short", day: "numeric", month: "short" }); // "Sat 24 Oct"
const formatLongDate = dateFormat({ weekday: "long", day: "numeric", month: "long" }); // "Friday 23 October"

// "8:00", in Lisbon time.
export function formatSlotTime(iso) {
  const p = lisbonParts(new Date(iso));
  return `${p.hour}:${pad(p.minute)}`;
}

// "Friday 23 October, 10:00 Lisbon time"
export function formatPickup(iso) {
  return `${formatLongDate(lisbonDate(new Date(iso)))}, ${formatSlotTime(iso)} Lisbon time`;
}
