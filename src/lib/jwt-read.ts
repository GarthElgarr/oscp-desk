export type JwtClaim = { name: string; value: string; note: string };

export type JwtRead = {
  ok: boolean;
  title: string;
  detail: string;
  next: string;
  headerText: string;
  payloadText: string;
  claims: JwtClaim[];
};

const HMAC = new Set(["HS256", "HS384", "HS512"]);
const ASYM = new Set(["RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "PS256", "PS384", "PS512"]);

function pad(part: string): string {
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  return b64 + "=".repeat((4 - (b64.length % 4)) % 4);
}

function decodePart(part: string): unknown {
  const binary = atob(pad(part));
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function claim(name: string, value: unknown, note: string): JwtClaim {
  return { name, value: typeof value === "string" ? value : JSON.stringify(value), note };
}

function unix(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d{1,16}(\.\d+)?$/.test(value.trim())) {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function expClaim(exp: number, now: number): JwtClaim {
  let seconds = exp;
  let scaled = false;
  if (Math.abs(exp) >= 1e11 && Math.abs(exp) < 1e14) {
    seconds = exp / 1000;
    scaled = true;
  }
  const when = new Date(seconds * 1000);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 4_102_444_800 || Number.isNaN(when.getTime())) {
    return claim("exp", String(exp), "exp is not a unix time between 1970 and 2100. Send the original token once and read the status code.");
  }
  return claim(
    "exp",
    `${exp} (${when.toISOString()}${scaled ? ", read as milliseconds" : ""})`,
    seconds < now
      ? "Already expired. Send the original token once. 401 means expiry is enforced."
      : "Still inside exp. Expiry is not your bug yet.",
  );
}

export function readJwt(raw: string): JwtRead {
  const empty = {
    headerText: "",
    payloadText: "",
    claims: [] as JwtClaim[],
  };
  let token = raw.trim().replace(/^bearer\s+/i, "");
  token = token.replace(/^["']|["']$/g, "").replace(/\s+/g, "");
  if (!token) {
    return {
      ...empty,
      ok: false,
      title: "Paste a token",
      detail: "Header, payload, signature. Or a whole Authorization line.",
      next: "Nothing is sent. The split happens in this page.",
    };
  }
  const parts = token.split(".");
  const unsigned = parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2] === "";
  const shaped = parts.length === 3 && parts.every((part) => part.length > 0);
  if (!shaped && !unsigned) {
    return {
      ...empty,
      ok: false,
      title: "Not a JWT",
      detail: "A JWT has two dots. This value does not. It is an opaque session or a hash.",
      next: "Do not run hashcat on it. Go back to API 2 and change one id.",
    };
  }
  let header: unknown;
  let payload: unknown;
  try {
    header = decodePart(parts[0]);
    payload = decodePart(parts[1]);
  } catch {
    return {
      ...empty,
      ok: false,
      title: "Does not decode",
      detail: "The first two parts are not base64url JSON.",
      next: "You copied a fragment, or this cookie is not a JWT. Stop.",
    };
  }
  if (!header || typeof header !== "object" || Array.isArray(header) || !payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      ...empty,
      ok: false,
      title: "JSON, but not a token",
      detail: "Header and payload both need to be objects.",
      next: "Check you pasted the token and not the API response.",
    };
  }
  const head = header as Record<string, unknown>;
  const body = payload as Record<string, unknown>;
  const algShown = typeof head.alg === "string" ? head.alg.trim() : "";
  const alg = algShown.toUpperCase();
  const claims: JwtClaim[] = [];
  const now = Math.floor(Date.now() / 1000);

  if (!algShown) {
    claims.push(claim("alg", "(missing)", "No alg. Treat it as JWT 2: one request, then stop if it is rejected."));
  } else if (alg === "NONE") {
    claims.push(claim("alg", algShown, "This token already says none. One replay. 401 and you stop. Do not cycle capitalisation."));
  } else if (HMAC.has(alg)) {
    claims.push(claim("alg", algShown, "HMAC. Shared secret. JWT 3, short wordlist first. Not rockyou, and not if you still have other leads."));
  } else if (ASYM.has(alg)) {
    claims.push(claim("alg", algShown, "Asymmetric. Do not hashcat this. JWT 4. One confusion request only if JWKS gave you the public key."));
  } else {
    claims.push(claim("alg", algShown, "Unknown alg. One request with the original token. A 401 means you cannot use it. Do not invent a mode."));
  }

  if (typeof head.kid === "string") {
    const pathLike = /[\\/]/.test(head.kid);
    claims.push(
      claim(
        "kid",
        head.kid,
        pathLike
          ? "kid looks like a path. JWT 5, one empty-secret test, then stop on 401."
          : "kid is a key id. That is normal. Not a file read.",
      ),
    );
  }

  for (const name of ["sub", "user", "username", "email", "role", "admin", "isAdmin"]) {
    if (name in body) {
      claims.push(
        claim(
          name,
          body[name],
          "A claim is not permission. It counts only when a signature the server accepts covers a value you changed.",
        ),
      );
    }
  }

  const exp = unix(body.exp);
  if (exp !== null) claims.push(expClaim(exp, now));

  let next = "Open JWT 2. Confirm the server checks the signature before you touch the secret.";
  if (alg === "NONE") next = "JWT 2 is a single replay of this token. 401 ends JWT.";
  else if (HMAC.has(alg)) next = "JWT 2 first, one none token. If that is 401, JWT 3 with a short wordlist.";
  else if (ASYM.has(alg)) next = "JWT 4. Fetch JWKS. Do not run hashcat -m 16500 on this token.";

  return {
    ok: true,
    title: algShown ? `alg ${algShown}` : "No alg",
    detail: parts[2]
      ? `Signature is ${parts[2].length} characters. This page did not check it and did not send the token.`
      : "Signature is empty. That only matters if the API still returns 200.",
    next,
    headerText: pretty(header),
    payloadText: pretty(payload),
    claims,
  };
}
