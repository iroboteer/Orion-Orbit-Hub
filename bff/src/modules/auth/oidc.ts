// OIDC Configuration
// Supports: Azure AD, Okta, Keycloak, Google Workspace

export interface OIDCConfig {
  provider: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  claimsMapping?: {
    email?: string;
    name?: string;
    groups?: string;
  };
}

// Get OIDC config from environment
export function getOIDCConfig(): OIDCConfig | null {
  const issuer = process.env.OIDC_ISSUER;
  if (!issuer) return null;

  return {
    provider: process.env.OIDC_PROVIDER || "generic",
    issuer,
    clientId: process.env.OIDC_CLIENT_ID || "",
    clientSecret: process.env.OIDC_CLIENT_SECRET || "",
    redirectUri: process.env.OIDC_REDIRECT_URI || "http://localhost:3100/api/v1/auth/oidc/callback",
    scopes: (process.env.OIDC_SCOPES || "openid profile email").split(" "),
    claimsMapping: {
      email: process.env.OIDC_CLAIM_EMAIL || "email",
      name: process.env.OIDC_CLAIM_NAME || "name",
      groups: process.env.OIDC_CLAIM_GROUPS || "groups",
    },
  };
}

// Build authorization URL with PKCE
export function buildAuthUrl(config: OIDCConfig, state: string, codeVerifier: string): string {
  const crypto = require("crypto");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes?.join(" ") || "openid profile email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${config.issuer}/authorize?${params}`;
}

// Exchange code for tokens
export async function exchangeCode(config: OIDCConfig, code: string, codeVerifier: string) {
  const res = await fetch(`${config.issuer}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  });
  return res.json();
}

// Parse JWT without verification (IdP already verified)
export function parseJwt(token: string) {
  const payload = token.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString());
}
