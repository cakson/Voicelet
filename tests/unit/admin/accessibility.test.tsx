import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuildList } from '../../../admin/src/features/guilds/components/guild-list';

it('exposes a labelled enable control and accessible loading state', () => {
  const handlers = {
    onAddConfiguration: vi.fn(),
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggle: vi.fn(),
  };
  const { rerender } = render(<GuildList guilds={[]} loading {...handlers} />);
  expect(screen.getByLabelText('Loading guilds')).toBeInTheDocument();
  rerender(
    <GuildList
      loading={false}
      {...handlers}
      guilds={[{ guildId: '123456789012345678', configurationStatus: 'configured', enabled: true }]}
    />,
  );
  expect(
    screen.getByRole('switch', { name: 'Enable Voicelet for 123456789012345678' }),
  ).toBeInTheDocument();
});
