import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GuildList } from '../../../admin/src/features/guilds/components/guild-list';

const actions = () => ({
  onAddConfiguration: vi.fn(),
  onView: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onToggle: vi.fn(),
});

describe('GuildList', () => {
  it('shows the empty state and registration-ready configuration state', () => {
    const handlers = actions();
    const { rerender } = render(<GuildList guilds={[]} loading={false} {...handlers} />);
    expect(screen.getByText(/No guilds are registered/)).toBeInTheDocument();
    rerender(
      <GuildList
        loading={false}
        {...handlers}
        guilds={[
          { guildId: '123456789012345678', configurationStatus: 'unconfigured', enabled: null },
        ]}
      />,
    );
    expect(screen.getByText('Unconfigured')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add configuration' })).toBeInTheDocument();
  });
  it('shows configured enabled state and persists toggle intent through its callback', async () => {
    const user = userEvent.setup();
    const handlers = actions();
    render(
      <GuildList
        loading={false}
        {...handlers}
        guilds={[
          { guildId: '123456789012345678', configurationStatus: 'configured', enabled: true },
        ]}
      />,
    );
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    await user.click(screen.getByRole('switch'));
    expect(handlers.onToggle).toHaveBeenCalledWith('123456789012345678', false);
  });
});
