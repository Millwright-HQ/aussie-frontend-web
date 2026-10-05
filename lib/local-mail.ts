import 'server-only';

/**
 * Local development only: the emails the emulator (Floci) "sent". Real mail never leaves your
 * machine locally, so this is where sign-up codes, reset codes, admin invitations and order
 * emails can be read. Nothing here exists on dev or prod (those use real email).
 */
export const localMailEnabled = () => process.env.NEXT_PUBLIC_ENV_NAME === 'local';

export interface LocalMail {
  id: string;
  at: string;
  to: string[];
  subject: string;
  text: string;
  /** Six-digit codes and temporary passwords found in the message, for quick copying. */
  highlights: string[];
}

const TEMP_PASSWORD = /temporary password\D{0,10}?:?\s*([^\s<]{10,})/i;

export async function readLocalMail(to?: string): Promise<LocalMail[] | null> {
  const endpoint = process.env.COGNITO_ENDPOINT;
  if (!localMailEnabled() || !endpoint) return null;
  try {
    const res = await fetch(`${endpoint}/_aws/ses`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return null;
    const { messages = [] } = (await res.json()) as {
      messages?: {
        Id?: string;
        Timestamp?: string;
        Subject?: string;
        Destination?: { ToAddresses?: string[] };
        Body?: { text_part?: string; html_part?: string };
      }[];
    };
    return (
      messages
        .map((m): LocalMail => {
          const html = m.Body?.html_part ?? '';
          const text = (
            m.Body?.text_part ?? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
          ).trim();
          const password = TEMP_PASSWORD.exec(text)?.[1];
          const highlights = [
            ...new Set([...(text.match(/\b\d{6}\b/g) ?? []), ...(password ? [password] : [])]),
          ];
          return {
            id: m.Id ?? `${m.Timestamp}-${m.Subject}`,
            at: m.Timestamp ?? '',
            to: m.Destination?.ToAddresses ?? [],
            subject: m.Subject ?? '(no subject)',
            text,
            highlights,
          };
        })
        // The emulator's list is not in send order: newest first by time.
        .sort((a, b) => b.at.localeCompare(a.at))
        .filter((m) => !to || m.to.some((t) => t.toLowerCase().includes(to.toLowerCase())))
        .slice(0, 60)
    );
  } catch {
    return null;
  }
}
