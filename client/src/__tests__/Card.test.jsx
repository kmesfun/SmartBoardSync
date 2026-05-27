/**
 * Card Component Tests
 * Watch: npm run test:watch (vitest auto-reruns on file changes)
 *
 * Re-runs when: Card.jsx changes.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../components/Card';

const baseCard = {
  id: 'card-1',
  title: 'Fix login bug',
  description: 'The login button does nothing on mobile',
  position: 1.0,
  locked_by: null,
};

describe('Card component', () => {
  it('renders the card title', () => {
    render(<Card card={baseCard} isLocked={false} lockedBy={null} />);
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
  });

  it('does NOT show a lock overlay when the card is free', () => {
    render(<Card card={baseCard} isLocked={false} lockedBy={null} />);
    expect(screen.queryByTestId('lock-overlay')).not.toBeInTheDocument();
  });

  it('shows a lock overlay when the card is locked', () => {
    render(
      <Card
        card={{ ...baseCard, locked_by: 'user-b-id' }}
        isLocked={true}
        lockedBy={{ id: 'user-b-id', name: 'User B' }}
      />
    );
    expect(screen.getByTestId('lock-overlay')).toBeInTheDocument();
  });

  it('shows the locking user name in the overlay', () => {
    render(
      <Card
        card={{ ...baseCard, locked_by: 'user-b-id' }}
        isLocked={true}
        lockedBy={{ id: 'user-b-id', name: 'User B' }}
      />
    );
    expect(screen.getByText(/User B/i)).toBeInTheDocument();
  });

  it('has data-locked attribute set correctly', () => {
    const { rerender } = render(
      <Card card={baseCard} isLocked={false} lockedBy={null} />
    );
    expect(screen.getByTestId(`card-${baseCard.id}`)).toHaveAttribute('data-locked', 'false');

    rerender(
      <Card
        card={{ ...baseCard, locked_by: 'user-b-id' }}
        isLocked={true}
        lockedBy={{ id: 'user-b-id', name: 'User B' }}
      />
    );
    expect(screen.getByTestId(`card-${baseCard.id}`)).toHaveAttribute('data-locked', 'true');
  });
});
