import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAccount } from '../api/auth.js';
import RegisterPage from './RegisterPage.jsx';

vi.mock('../api/auth.js', () => ({
  registerAccount: vi.fn(),
}));

vi.mock('../utils/session.js', () => ({
  persistAuthSession: vi.fn(),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows a success notification after creating an account', async () => {
    const user = userEvent.setup();
    registerAccount.mockResolvedValue({
      token: 'token',
      role: 'customer',
      user: { customerId: 1 },
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText('Last name'), 'Nguyen');
    await user.type(screen.getByPlaceholderText('First name'), 'An');
    await user.type(screen.getByPlaceholderText('example@email.com'), 'an@example.com');
    await user.type(screen.getByPlaceholderText('Phone number'), '0901234567');
    await user.type(screen.getByPlaceholderText('Password'), 'Password123!');
    await user.type(screen.getByPlaceholderText('Confirm password'), 'Password123!');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Account registration completed.',
    );
  });

  it('shows an error notification when registration fails', async () => {
    const user = userEvent.setup();
    registerAccount.mockRejectedValue(new Error('Email is already registered.'));

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText('Last name'), 'Nguyen');
    await user.type(screen.getByPlaceholderText('First name'), 'An');
    await user.type(screen.getByPlaceholderText('example@email.com'), 'an@example.com');
    await user.type(screen.getByPlaceholderText('Phone number'), '0901234567');
    await user.type(screen.getByPlaceholderText('Password'), 'Password123!');
    await user.type(screen.getByPlaceholderText('Confirm password'), 'Password123!');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Register' }));

    const notification = await screen.findByRole('alert');
    expect(notification).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
    expect(notification).toHaveClass('error');
  });
});
