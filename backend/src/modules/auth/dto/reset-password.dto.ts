import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'メールアドレスの形式が正しくありません。' })
  @IsNotEmpty({ message: 'メールアドレスを入力してください。' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: '確認コードを入力してください。' })
  code: string;

  @IsString()
  @MinLength(6, { message: '新しいパスワードは6文字以上で入力してください。' })
  newPassword: string;
}
