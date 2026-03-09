import {
  ToolError,
  buildQueryString,
  clearAuthCache,
  fetchFromPage,
  getAuthCache,
  getLocalStorage,
  setAuthCache,
  waitUntil,
} from '@opentabs-dev/plugin-sdk';

// --- Types ---

interface BlueskySession {
  accessJwt: string;
  refreshJwt: string;
  did: string;
  handle: string;
  pdsUrl: string;
  active: boolean;
}

interface BlueskyStorageData {
  session?: {
    currentAccount?: BlueskySession;
  };
}

interface XrpcOptions {
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string | number | boolean | undefined>;
  extraHeaders?: Record<string, string>;
}

const AUTH_CACHE_KEY = 'bluesky';

// --- Auth detection ---
// Bluesky stores session data in localStorage under `BSKY_STORAGE`.
// The session contains a JWT access token and the user's PDS URL, which
// is the base for all XRPC API calls. The PDS URL is cross-origin from
// bsky.app, so we use raw fetch with the Authorization header instead
// of credentials: 'include'.

const getSession = (): BlueskySession | null => {
  const cached = getAuthCache<BlueskySession>(AUTH_CACHE_KEY);
  if (cached?.accessJwt && cached.pdsUrl && cached.did) return cached;

  const raw = getLocalStorage('BSKY_STORAGE');
  if (!raw) return null;

  let data: BlueskyStorageData;
  try {
    data = JSON.parse(raw) as BlueskyStorageData;
  } catch {
    return null;
  }

  const account = data.session?.currentAccount;
  if (!account?.accessJwt || !account.pdsUrl || !account.did || !account.active) return null;

  setAuthCache(AUTH_CACHE_KEY, account);
  return account;
};

export const isAuthenticated = (): boolean => getSession() !== null;

export const waitForAuth = (): Promise<boolean> =>
  waitUntil(() => isAuthenticated(), { interval: 500, timeout: 5000 }).then(
    () => true,
    () => false,
  );

/** Returns the user's DID or throws an auth error. */
export const getDid = (): string => {
  const session = getSession();
  if (!session) throw ToolError.auth('Not authenticated — please log in to Bluesky.');
  return session.did;
};

// --- Shared XRPC caller ---
// The PDS URL is cross-origin from bsky.app, so we use credentials:'omit'
// with a Bearer token instead of credentials:'include' (session cookies).
// fetchFromPage handles timeout, network errors, and httpStatusToToolError.

const xrpc = async <T>(nsid: string, options: XrpcOptions = {}): Promise<T> => {
  const session = getSession();
  if (!session) throw ToolError.auth('Not authenticated — please log in to Bluesky.');

  const base = session.pdsUrl.endsWith('/') ? session.pdsUrl : `${session.pdsUrl}/`;
  const qs = options.query ? buildQueryString(options.query) : '';
  const url = qs ? `${base}xrpc/${nsid}?${qs}` : `${base}xrpc/${nsid}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessJwt}`,
    Accept: 'application/json',
    ...options.extraHeaders,
  };

  let body: string | undefined;
  if (options.body) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetchFromPage(url, {
      method: options.method ?? 'GET',
      headers,
      body,
      credentials: 'omit',
    });
  } catch (err: unknown) {
    // Clear auth cache on auth errors so token is re-read from localStorage
    if (err instanceof ToolError && err.category === 'auth') {
      clearAuthCache(AUTH_CACHE_KEY);
    }
    throw err;
  }

  if (response.status === 204) return {} as T;
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
};

// --- Public API callers ---

/** Calls an AT Protocol XRPC endpoint on the user's PDS. */
export const api = <T>(
  nsid: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    query?: Record<string, string | number | boolean | undefined>;
  } = {},
): Promise<T> => xrpc<T>(nsid, options);

/** Calls a chat XRPC endpoint with the `atproto-proxy` header for chat operations. */
export const chatApi = <T>(
  nsid: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    query?: Record<string, string | number | boolean | undefined>;
  } = {},
): Promise<T> => xrpc<T>(nsid, { ...options, extraHeaders: { 'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat' } });
