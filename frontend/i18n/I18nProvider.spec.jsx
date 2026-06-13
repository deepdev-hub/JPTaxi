import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { catalogs } from './catalogs.js';
import { I18nProvider, useI18n } from './I18nProvider.jsx';

function Example() {
  const { language, setLanguage, t } = useI18n();
  return (
    <>
      <p>{t('dispatch.customer.expanding', { radius: 4 })}</p>
      <button type="button" onClick={() => setLanguage('vi')}>{language}</button>
    </>
  );
}

describe('i18n catalogs', () => {
  it('keeps the same key set for Japanese and Vietnamese', () => {
    const expected = Object.keys(catalogs.ja).sort();
    expect(Object.keys(catalogs.vi).sort()).toEqual(expected);
  });

  it('updates translated text and the document language without DOM translation', async () => {
    localStorage.setItem('jpTaxiLanguage', 'ja');
    const user = userEvent.setup();
    render(<I18nProvider><Example /></I18nProvider>);

    expect(screen.getByText(/半径 4 km 以内で検索中/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ja' }));
    expect(screen.getByText(/bán kính 4 km/i)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('vi');
  });
});
