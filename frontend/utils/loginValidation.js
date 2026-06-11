export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginForm({ email, password }) {
  const nextErrors = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    nextErrors.email = 'メールアドレスを入力してください。';
  } else if (!emailPattern.test(trimmedEmail)) {
    nextErrors.email = '正しいメールアドレス形式で入力してください。';
  }

  if (!password) {
    nextErrors.password = 'パスワードを入力してください。';
  } else if (password.length < 6) {
    nextErrors.password = 'パスワードは6文字以上で入力してください。';
  }

  return nextErrors;
}
