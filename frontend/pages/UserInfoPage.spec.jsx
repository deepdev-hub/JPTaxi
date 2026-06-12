import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCustomerProfile,
  updateCustomerProfile,
  uploadAvatar,
} from '../api/accounts.js';
import {
  addPaymentMethod,
  getLoginHistory,
  getNotificationPreferences,
  getPaymentMethods,
} from '../api/customers.js';
import { I18nProvider } from '../i18n/I18nProvider.jsx';
import UserInfoPage from './UserInfoPage.jsx';

vi.mock('../api/accounts.js', () => ({
  getCustomerProfile: vi.fn(),
  resolveAssetUrl: vi.fn((url) => url || ''),
  updateCustomerProfile: vi.fn(),
  uploadAvatar: vi.fn(),
}));

vi.mock('../api/auth.js', () => ({
  changePassword: vi.fn(),
}));

vi.mock('../api/customers.js', () => ({
  addPaymentMethod: vi.fn(),
  getLoginHistory: vi.fn(),
  getNotificationPreferences: vi.fn(),
  getPaymentMethods: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}));

vi.mock('../components/AvatarCropper.jsx', async () => {
  const React = await import('react');
  return {
    default: React.forwardRef(function MockAvatarCropper(_props, ref) {
      React.useImperativeHandle(ref, () => ({
        createCroppedFile: async () =>
          new File(['cropped'], 'avatar.jpg', { type: 'image/jpeg' }),
      }));
      return <div data-testid="avatar-cropper" />;
    }),
  };
});

function renderPage(section) {
  return render(
    <MemoryRouter initialEntries={[`/user-info/${section}`]}>
      <I18nProvider>
        <Routes>
          <Route path="/user-info/:section" element={<UserInfoPage />} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe('UserInfoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:avatar-preview');
    URL.revokeObjectURL = vi.fn();
    localStorage.setItem('jpTaxiLanguage', 'en');
    getCustomerProfile.mockResolvedValue({
      lastName: 'Nguyen',
      firstName: 'An',
      email: 'customer@jptaxi.local',
      phone: '0901000001',
      gender: 'Male',
      birthDate: '1995-04-12',
      loginHistory: [],
    });
    getNotificationPreferences.mockResolvedValue({
      rideUpdates: true,
      emailNotifications: true,
      promotions: false,
    });
    getPaymentMethods.mockResolvedValue([]);
    getLoginHistory.mockResolvedValue([]);
  });

  it('shows card validation inside the modal without calling the API', async () => {
    const user = userEvent.setup();
    renderPage('payment');

    await user.click(await screen.findByRole('button', {
      name: /add visa card/i,
    }));
    await user.click(screen.getByRole('button', { name: /save card/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /card holder is required/i,
    );
    expect(addPaymentMethod).not.toHaveBeenCalled();
  });

  it('formats and stores the card expiry as MM/YYYY', async () => {
    const user = userEvent.setup();
    addPaymentMethod.mockResolvedValue({});
    getPaymentMethods
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        paymentMethodId: 1,
        brand: 'VISA',
        lastFour: '1111',
        isDefault: true,
      }]);
    renderPage('payment');

    await user.click(await screen.findByRole('button', {
      name: /add visa card/i,
    }));
    await user.type(screen.getByLabelText(/cardholder/i), 'NGUYEN AN');
    await user.type(screen.getByLabelText(/card number/i), '4111111111111111');
    const expiryInput = screen.getByLabelText(/expiry date/i);
    await user.type(expiryInput, '122030');
    await user.type(screen.getByLabelText(/security code/i), '123');

    expect(expiryInput).toHaveValue('12/2030');

    await user.click(screen.getByRole('button', { name: /save card/i }));

    expect(addPaymentMethod).toHaveBeenCalledWith(expect.objectContaining({
      expiryMonth: 12,
      expiryYear: 2030,
    }));
  });

  it('keeps the card modal open and shows an API error', async () => {
    const user = userEvent.setup();
    addPaymentMethod.mockRejectedValue(new Error('Card tokenization failed.'));
    renderPage('payment');

    await user.click(await screen.findByRole('button', {
      name: /add visa card/i,
    }));
    await user.type(screen.getByLabelText(/cardholder/i), 'NGUYEN AN');
    await user.type(screen.getByLabelText(/card number/i), '4111111111111111');
    await user.type(screen.getByLabelText(/expiry date/i), '122030');
    await user.type(screen.getByLabelText(/security code/i), '123');
    await user.click(screen.getByRole('button', { name: /save card/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('reloads cards from the database and preserves the existing default', async () => {
    const user = userEvent.setup();
    const existingCard = {
      paymentMethodId: 1,
      brand: 'VISA',
      lastFour: '4821',
      isDefault: true,
    };
    const newCard = {
      paymentMethodId: 2,
      brand: 'VISA',
      lastFour: '1111',
      isDefault: false,
    };
    getPaymentMethods
      .mockResolvedValueOnce([existingCard])
      .mockResolvedValueOnce([existingCard, newCard]);
    addPaymentMethod.mockResolvedValue(newCard);
    renderPage('payment');

    await user.click(await screen.findByRole('button', {
      name: /add visa card/i,
    }));
    await user.type(screen.getByLabelText(/cardholder/i), 'NGUYEN AN');
    await user.type(screen.getByLabelText(/card number/i), '4111111111111111');
    await user.type(screen.getByLabelText(/expiry date/i), '122030');
    await user.type(screen.getByLabelText(/security code/i), '123');
    await user.click(screen.getByRole('button', { name: /save card/i }));

    expect(await screen.findByText('VISA **** 1111')).toBeInTheDocument();
    expect(screen.getByText('Default Payment Method')).toBeInTheDocument();
    expect(getPaymentMethods).toHaveBeenCalledTimes(2);
    expect(addPaymentMethod).toHaveBeenCalledWith(expect.objectContaining({
      isDefault: false,
    }));
  });

  it('disables the save button while a card is being stored', async () => {
    const user = userEvent.setup();
    let finishSave;
    addPaymentMethod.mockReturnValue(new Promise((resolve) => {
      finishSave = resolve;
    }));
    getPaymentMethods
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        paymentMethodId: 3,
        brand: 'VISA',
        lastFour: '1111',
        isDefault: true,
      }]);
    renderPage('payment');

    await user.click(await screen.findByRole('button', {
      name: /add visa card/i,
    }));
    await user.type(screen.getByLabelText(/cardholder/i), 'NGUYEN AN');
    await user.type(screen.getByLabelText(/card number/i), '4111111111111111');
    await user.type(screen.getByLabelText(/expiry date/i), '122030');
    await user.type(screen.getByLabelText(/security code/i), '123');
    await user.click(screen.getByRole('button', { name: /save card/i }));

    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    finishSave({});
    expect(await screen.findByText('VISA **** 1111')).toBeInTheDocument();
  });

  it('localizes the empty payment-method state in Japanese', async () => {
    localStorage.setItem('jpTaxiLanguage', 'ja');
    renderPage('payment');

    expect(await screen.findByText('保存済みのお支払い方法はありません。')).toBeInTheDocument();
  });

  it('localizes every language option in the selected language', async () => {
    localStorage.setItem('jpTaxiLanguage', 'vi');
    renderPage('language');

    const select = await screen.findByRole('combobox', { name: 'Ngôn ngữ hiển thị' });
    expect(within(select).getByRole('option', { name: 'Tiếng Nhật' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Tiếng Việt' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Tiếng Anh' })).toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: '日本語' })).not.toBeInTheDocument();
  });

  it('shows recent login history directly on the security page', async () => {
    getLoginHistory.mockResolvedValue([{
      loginTime: '2026-06-11T12:30:00.000Z',
      ipAddress: '127.0.0.1',
      userAgent: 'JP Taxi Browser',
    }]);

    renderPage('security');

    expect(await screen.findByText('JP Taxi Browser')).toBeInTheDocument();
    expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getLoginHistory).toHaveBeenCalledTimes(1);
  });

  it('loads login history on demand with time, IP and device details', async () => {
    const user = userEvent.setup();
    getLoginHistory.mockResolvedValue([{
      loginTime: '2026-06-11T12:30:00.000Z',
      ipAddress: '127.0.0.1',
      userAgent: 'JP Taxi Browser',
    }]);
    renderPage('security');

    await user.click(await screen.findByRole('button', { name: 'Check' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('JP Taxi Browser')).toBeInTheDocument();
    expect(within(dialog).getByText('127.0.0.1')).toBeInTheDocument();
    expect(getLoginHistory).toHaveBeenCalledTimes(1);
  });

  it('shows a login-history API error inside the modal', async () => {
    const user = userEvent.setup();
    getLoginHistory.mockRejectedValue(new Error('Login history unavailable.'));
    renderPage('security');

    await user.click(await screen.findByRole('button', { name: 'Check' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
  });

  it('crops, uploads and stores an avatar with one save action', async () => {
    const user = userEvent.setup();
    uploadAvatar.mockResolvedValue('/uploads/avatars/customer.jpg');
    updateCustomerProfile.mockResolvedValue({
      lastName: 'Nguyen',
      firstName: 'An',
      email: 'customer@jptaxi.local',
      phone: '0901000001',
      gender: 'Male',
      birthDate: '1995-04-12',
      avatarUrl: '/uploads/avatars/customer.jpg',
    });
    renderPage('profile');

    await user.click(await screen.findByRole('button', {
      name: /change image/i,
    }));
    const fileInput = screen.getByRole('dialog').querySelector(
      'input[type="file"]',
    );
    await user.upload(
      fileInput,
      new File(['source'], 'portrait.png', { type: 'image/png' }),
    );
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(uploadAvatar).toHaveBeenCalledWith(expect.objectContaining({
      name: 'avatar.jpg',
      type: 'image/jpeg',
    }));
    expect(updateCustomerProfile).toHaveBeenCalledWith(expect.objectContaining({
      avatarUrl: '/uploads/avatars/customer.jpg',
    }));
  });

  it('rejects unsupported avatar files before upload', async () => {
    const user = userEvent.setup();
    renderPage('profile');

    await user.click(await screen.findByRole('button', {
      name: /change image/i,
    }));
    const fileInput = screen.getByRole('dialog').querySelector(
      'input[type="file"]',
    );
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['source'], 'portrait.gif', { type: 'image/gif' })],
      },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /only jpeg, png and webp/i,
    );
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('keeps the avatar modal open when upload fails', async () => {
    const user = userEvent.setup();
    uploadAvatar.mockRejectedValue(new Error('Avatar storage unavailable.'));
    renderPage('profile');

    await user.click(await screen.findByRole('button', {
      name: /change image/i,
    }));
    const fileInput = screen.getByRole('dialog').querySelector(
      'input[type="file"]',
    );
    await user.upload(
      fileInput,
      new File(['source'], 'portrait.png', { type: 'image/png' }),
    );
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(updateCustomerProfile).not.toHaveBeenCalled();
  });
});
