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
  async function fillCustomerRegistrationForm(user) {
    await user.type(screen.getByRole('textbox', { name: /姓|Last name/i }), 'Nguyen');
    await user.type(screen.getByRole('textbox', { name: /名|First name/i }), 'An');
    await user.type(screen.getByRole('textbox', { name: /メールアドレス|Email/i }), 'an@example.com');
    await user.type(screen.getByRole('textbox', { name: /電話番号|Phone number/i }), '0901234567');
    await user.type(screen.getByLabelText(/^パスワード$|^Password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/パスワード確認|Confirm password/i), 'Password123!');
  }

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

    await fillCustomerRegistrationForm(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /登録|Register/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /アカウント登録が完了しました。|Account registration completed\./i,
    );
  });

  it('shows an error notification when registration fails', async () => {
    const user = userEvent.setup();
    registerAccount.mockRejectedValue({
      code: 'BAD_REQUEST',
      status: 400,
      message: 'Email is already registered.',
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>,
    );

    await fillCustomerRegistrationForm(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /登録|Register/i }));

    const notification = await screen.findByRole('alert');
    expect(notification).toHaveTextContent('Email is already registered.');
    expect(notification).toHaveClass('error');
  });

  it('submits the full pending driver registration payload', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('jpTaxiPendingDriverRegistration', JSON.stringify({
      lastName: 'Nguyen',
      firstName: 'An',
      phone: '0901234567',
      language: 'N2',
      licenseNumber: 'DL-123456789',
      licenseType: 'B',
      licenseExpiryDate: '2028-12-31',
      vehicleBrand: 'Toyota Vios',
      vehicleColor: 'White',
      vehicleType: '4',
      licensePlate: '30A-12345',
      documents: {
        portrait: '/uploads/portrait.webp',
        japaneseCertificate: '/uploads/japanese-certificate.webp',
        licenseFront: '/uploads/license-front.webp',
        licenseBack: '/uploads/license-back.webp',
        vehiclePhoto: '/uploads/vehicle-photo.webp',
        registrationPaper: '/uploads/registration-paper.webp',
      },
    }));
    registerAccount.mockResolvedValue({
      token: 'token',
      role: 'driver',
      user: { driverId: 99 },
    });

    render(
      <MemoryRouter initialEntries={['/register?role=driver']}>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByRole('textbox', { name: /メールアドレス|Email/i }), 'driver@example.com');
    await user.type(screen.getByLabelText(/^パスワード$|^Password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/パスワード確認|Confirm password/i), 'Password123!');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /登録|Register/i }));

    expect(registerAccount).toHaveBeenCalledWith(expect.objectContaining({
      role: 'driver',
      email: 'driver@example.com',
      phone: '0901234567',
      japanese_certificate_url: '/uploads/japanese-certificate.webp',
      portrait_url: '/uploads/portrait.webp',
      license_front_url: '/uploads/license-front.webp',
      license_back_url: '/uploads/license-back.webp',
      vehicle_photo_url: '/uploads/vehicle-photo.webp',
      registration_paper_url: '/uploads/registration-paper.webp',
    }));
  });
});
