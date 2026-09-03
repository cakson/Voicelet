import type { ApiError, ConfigurationInput, GuildDetail, GuildSummary } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/admin/api${path}`, {
      ...init,
      headers: { ...(init?.body ? { 'content-type': 'application/json' } : {}), ...init?.headers },
    });
  } catch {
    throw Object.assign(new Error('Voicelet is unavailable. Try again shortly.'), {
      code: 'service_unavailable',
    }) as ApiError;
  }
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => undefined)) as
    | { error?: { code?: string; message?: string; fields?: Record<string, string> } }
    | T
    | undefined;
  if (!response.ok) {
    const error =
      'error' in (body ?? {})
        ? (body as { error: { code?: string; message?: string; fields?: Record<string, string> } })
            .error
        : undefined;
    throw Object.assign(
      new Error(error?.message ?? 'Voicelet could not complete this operation.'),
      error ?? {},
    ) as ApiError;
  }
  return body as T;
}

export const guildAdminApi = {
  list: () => request<{ guilds: GuildSummary[] }>('/guilds').then((result) => result.guilds),
  get: (guildId: string) => request<GuildDetail>(`/guilds/${encodeURIComponent(guildId)}`),
  register: (
    guildId: string,
    configuration?: Omit<ConfigurationInput, 'enabled'> & { enabled?: boolean },
  ) =>
    request<GuildDetail>('/guilds', {
      method: 'POST',
      body: JSON.stringify({ guildId, configuration: configuration ?? null }),
    }),
  save: (guildId: string, configuration: ConfigurationInput, expectedRevision: number | null) =>
    request<GuildDetail>(`/guilds/${encodeURIComponent(guildId)}/configuration`, {
      method: 'PUT',
      body: JSON.stringify({ ...configuration, expectedRevision }),
    }),
  setEnabled: (guildId: string, enabled: boolean, expectedRevision: number) =>
    request<GuildDetail>(`/guilds/${encodeURIComponent(guildId)}/configuration/enabled`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled, expectedRevision }),
    }),
  remove: (guildId: string) =>
    request<void>(`/guilds/${encodeURIComponent(guildId)}`, { method: 'DELETE' }),
};
