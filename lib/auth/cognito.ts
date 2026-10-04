import {
  type AuthenticationResultType,
  AssociateSoftwareTokenCommand,
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  GetUserCommand,
  InitiateAuthCommand,
  type InitiateAuthCommandOutput,
  ResendConfirmationCodeCommand,
  RespondToAuthChallengeCommand,
  RevokeTokenCommand,
  SetUserMFAPreferenceCommand,
  SignUpCommand,
  VerifySoftwareTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'node:crypto';
import { type Audience, awsRegion, cognitoEndpoint, poolConfig } from './config';

let client: CognitoIdentityProviderClient | undefined;

/** Public Cognito APIs only; app-client secrets authenticate us, no IAM credentials needed. */
function cognito(): CognitoIdentityProviderClient {
  client ??= new CognitoIdentityProviderClient({
    region: awsRegion(),
    endpoint: cognitoEndpoint(),
    // Local emulator still wants credentials on the request; these are never valid on AWS.
    ...(cognitoEndpoint()
      ? { credentials: { accessKeyId: 'local', secretAccessKey: 'local' } }
      : {}),
  });
  return client;
}

function secretHash(a: Audience, username: string): string {
  const { clientId, clientSecret } = poolConfig(a);
  return createHmac('sha256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

/** Context passed to Cognito triggers (login alerts). Only our server can send it (client secret). */
export interface ClientContext {
  ip: string;
  userAgent: string;
}

export type AuthStep =
  | {
      kind: 'tokens';
      tokens: Required<Pick<AuthenticationResultType, 'AccessToken' | 'ExpiresIn'>> &
        AuthenticationResultType;
      username: string;
    }
  | { kind: 'new-password'; session: string; username: string }
  | { kind: 'mfa-setup'; session: string; username: string }
  | { kind: 'totp'; session: string; username: string };

/**
 * Cognito's canonical username is the user's UUID. After the first call, challenge responses
 * (and their SECRET_HASH) must use the USERNAME Cognito returns, not the email.
 */
function toStep(res: InitiateAuthCommandOutput, fallbackUsername: string): AuthStep {
  const username =
    res.ChallengeParameters?.USERNAME ??
    res.ChallengeParameters?.USER_ID_FOR_SRP ??
    fallbackUsername;
  const r = res.AuthenticationResult;
  if (r?.AccessToken && r.ExpiresIn) {
    return {
      kind: 'tokens',
      tokens: { ...r, AccessToken: r.AccessToken, ExpiresIn: r.ExpiresIn },
      username,
    };
  }
  const session = res.Session ?? '';
  switch (res.ChallengeName) {
    case 'NEW_PASSWORD_REQUIRED':
      return { kind: 'new-password', session, username };
    case 'MFA_SETUP':
      return { kind: 'mfa-setup', session, username };
    case 'SOFTWARE_TOKEN_MFA':
      return { kind: 'totp', session, username };
    default:
      throw new Error(`Unsupported sign-in challenge: ${res.ChallengeName ?? 'none'}`);
  }
}

export async function signInWithPassword(
  a: Audience,
  email: string,
  password: string,
  ctx: ClientContext,
) {
  const res = await cognito().send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: poolConfig(a).clientId,
      AuthParameters: { USERNAME: email, PASSWORD: password, SECRET_HASH: secretHash(a, email) },
      ClientMetadata: { ...ctx },
    }),
  );
  return toStep(res, email);
}

async function respond(
  a: Audience,
  challenge: 'NEW_PASSWORD_REQUIRED' | 'MFA_SETUP' | 'SOFTWARE_TOKEN_MFA',
  session: string,
  username: string,
  extra: Record<string, string>,
  ctx: ClientContext,
) {
  const res = await cognito().send(
    new RespondToAuthChallengeCommand({
      ChallengeName: challenge,
      ClientId: poolConfig(a).clientId,
      Session: session,
      ChallengeResponses: { USERNAME: username, SECRET_HASH: secretHash(a, username), ...extra },
      ClientMetadata: { ...ctx },
    }),
  );
  return toStep(res, username);
}

export const completeNewPassword = (
  session: string,
  username: string,
  newPassword: string,
  ctx: ClientContext,
) =>
  respond('admin', 'NEW_PASSWORD_REQUIRED', session, username, { NEW_PASSWORD: newPassword }, ctx);

export const answerTotp = (session: string, username: string, code: string, ctx: ClientContext) =>
  respond('admin', 'SOFTWARE_TOKEN_MFA', session, username, { SOFTWARE_TOKEN_MFA_CODE: code }, ctx);

/** Starts authenticator enrolment: returns the shared secret to show as a QR code. */
export async function beginTotpSetup(session: string) {
  const res = await cognito().send(new AssociateSoftwareTokenCommand({ Session: session }));
  if (!res.SecretCode || !res.Session) throw new Error('Cognito did not return a TOTP secret');
  return { secret: res.SecretCode, session: res.Session };
}

export async function finishTotpSetup(
  session: string,
  username: string,
  code: string,
  ctx: ClientContext,
) {
  const verified = await cognito().send(
    new VerifySoftwareTokenCommand({
      Session: session,
      UserCode: code,
      FriendlyDeviceName: 'Authenticator app',
    }),
  );
  if (verified.Status !== 'SUCCESS' || !verified.Session) throw new Error('CodeMismatchException');
  return respond('admin', 'MFA_SETUP', verified.Session, username, {}, ctx);
}

// ── Authenticator app, managed by a signed-in admin (optional second step) ──────

export async function totpEnabled(accessToken: string): Promise<boolean> {
  const res = await cognito().send(new GetUserCommand({ AccessToken: accessToken }));
  return res.UserMFASettingList?.includes('SOFTWARE_TOKEN_MFA') ?? false;
}

/** New shared secret for the QR code. It only takes effect once a code is confirmed. */
export async function beginTotpEnrolment(accessToken: string): Promise<string> {
  const res = await cognito().send(new AssociateSoftwareTokenCommand({ AccessToken: accessToken }));
  if (!res.SecretCode) throw new Error('Cognito did not return a TOTP secret');
  return res.SecretCode;
}

export async function confirmTotpEnrolment(accessToken: string, code: string): Promise<void> {
  const verified = await cognito().send(
    new VerifySoftwareTokenCommand({
      AccessToken: accessToken,
      UserCode: code,
      FriendlyDeviceName: 'Authenticator app',
    }),
  );
  if (verified.Status !== 'SUCCESS') throw new Error('CodeMismatchException');
  await setTotpPreference(accessToken, true);
}

export const setTotpPreference = async (accessToken: string, enabled: boolean) => {
  await cognito().send(
    new SetUserMFAPreferenceCommand({
      AccessToken: accessToken,
      SoftwareTokenMfaSettings: { Enabled: enabled, PreferredMfa: enabled },
    }),
  );
};

export async function refreshTokens(a: Audience, refreshToken: string, username: string) {
  const res = await cognito().send(
    new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: poolConfig(a).clientId,
      AuthParameters: { REFRESH_TOKEN: refreshToken, SECRET_HASH: secretHash(a, username) },
    }),
  );
  const r = res.AuthenticationResult;
  if (!r?.AccessToken || !r.ExpiresIn) throw new Error('Refresh did not return tokens');
  return { accessToken: r.AccessToken, expiresIn: r.ExpiresIn, refreshToken: r.RefreshToken };
}

/** Invalidates the refresh token (and tokens issued from it). */
export async function revoke(a: Audience, refreshToken: string) {
  const { clientId, clientSecret } = poolConfig(a);
  await cognito().send(
    new RevokeTokenCommand({ Token: refreshToken, ClientId: clientId, ClientSecret: clientSecret }),
  );
}

// ── Customer self-service ───────────────────────────────────────────────────

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  marketingOptIn: boolean;
}) {
  await cognito().send(
    new SignUpCommand({
      ClientId: poolConfig('customer').clientId,
      SecretHash: secretHash('customer', input.email),
      Username: input.email,
      Password: input.password,
      UserAttributes: [
        { Name: 'email', Value: input.email },
        { Name: 'name', Value: input.name },
        { Name: 'custom:marketing_opt_in', Value: String(input.marketingOptIn) },
        { Name: 'custom:terms_accepted_at', Value: new Date().toISOString() },
      ],
    }),
  );
}

export async function confirmSignUp(email: string, code: string) {
  await cognito().send(
    new ConfirmSignUpCommand({
      ClientId: poolConfig('customer').clientId,
      SecretHash: secretHash('customer', email),
      Username: email,
      ConfirmationCode: code,
    }),
  );
}

export async function resendSignUpCode(email: string) {
  await cognito().send(
    new ResendConfirmationCodeCommand({
      ClientId: poolConfig('customer').clientId,
      SecretHash: secretHash('customer', email),
      Username: email,
    }),
  );
}

export async function startPasswordReset(a: Audience, email: string) {
  await cognito().send(
    new ForgotPasswordCommand({
      ClientId: poolConfig(a).clientId,
      SecretHash: secretHash(a, email),
      Username: email,
    }),
  );
}

export async function confirmPasswordReset(
  a: Audience,
  email: string,
  code: string,
  password: string,
) {
  await cognito().send(
    new ConfirmForgotPasswordCommand({
      ClientId: poolConfig(a).clientId,
      SecretHash: secretHash(a, email),
      Username: email,
      ConfirmationCode: code,
      Password: password,
    }),
  );
}

export async function changePassword(accessToken: string, previous: string, proposed: string) {
  await cognito().send(
    new ChangePasswordCommand({
      AccessToken: accessToken,
      PreviousPassword: previous,
      ProposedPassword: proposed,
    }),
  );
}

/**
 * Writes the real reason a sign-in step failed to the server log (the user only sees a generic
 * message). Never logs the email, password, codes or tokens: for Cognito errors only the error
 * name, HTTP status and request id; for our own errors (e.g. a missing variable) the message,
 * which names a variable and holds no user data.
 */
function logAuthError(
  err: { message?: string; $metadata?: { httpStatusCode?: number; requestId?: string } },
  name: string | undefined,
) {
  const fromCognito = err.$metadata !== undefined;
  console.error(
    JSON.stringify({
      level: 'error',
      event: 'auth.failed',
      error: name ?? 'unknown',
      status: err.$metadata?.httpStatusCode,
      requestId: err.$metadata?.requestId,
      ...(fromCognito ? {} : { message: err.message?.slice(0, 200) }),
    }),
  );
}

/** Maps Cognito errors to safe, user-facing messages (no account enumeration). */
export function authErrorMessage(err: unknown): string {
  const raw = err as {
    name?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number; requestId?: string };
  };
  // Plain `Error`s from our own code carry the Cognito error name in their message.
  const name = raw.name && raw.name !== 'Error' ? raw.name : raw.message;
  logAuthError(raw, name);
  switch (name) {
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      return 'Incorrect email or password.';
    case 'CodeMismatchException':
      return "That code isn't right. Check it and try again.";
    case 'ExpiredCodeException':
      return 'That code has expired. Request a new one.';
    case 'InvalidPasswordException':
      return 'That password does not meet the requirements.';
    case 'UsernameExistsException':
      return 'An account with this email already exists. Sign in instead.';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
    case 'TooManyFailedAttemptsException':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'PasswordResetRequiredException':
      return 'You need to reset your password before signing in.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
