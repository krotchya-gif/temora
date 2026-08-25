// ULID untuk nama file Storage (database.md §6: photos/{event}/{table}/{ulid}.jpg).
const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function ulid(now = Date.now()): string {
  let time = now;
  let timePart = "";
  for (let i = 0; i < 10; i++) {
    timePart = ENCODING[time % 32] + timePart;
    time = Math.floor(time / 32);
  }

  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  let randomPart = "";
  for (const byte of random) {
    randomPart += ENCODING[byte % 32];
  }

  return timePart + randomPart;
}
