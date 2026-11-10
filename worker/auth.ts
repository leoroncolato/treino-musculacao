import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
export interface AuthEnv {
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  ALLOWED_EMAIL: string;
}
const resolvers = new Map<string, JWTVerifyGetKey>();
export async function identity(
  request: Request,
  env: AuthEnv,
  testKey?: JWTVerifyGetKey,
): Promise<string> {
  if (
    !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN) ||
    !env.ACCESS_AUD ||
    !env.ALLOWED_EMAIL
  )
    throw new Error("unconfigured");
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) throw new Error("unauthorized");
  const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
  if (!resolvers.has(issuer))
    resolvers.set(
      issuer,
      createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)),
    );
  const { payload } = await jwtVerify(
    token,
    testKey ?? resolvers.get(issuer)!,
    {
      issuer,
      audience: env.ACCESS_AUD,
      algorithms: ["RS256"],
      requiredClaims: ["sub", "email", "exp", "iat"],
    },
  );
  if (
    payload.email !== env.ALLOWED_EMAIL ||
    typeof payload.sub !== "string" ||
    !payload.sub ||
    payload.type !== "app"
  )
    throw new Error("forbidden");
  return payload.sub;
}
