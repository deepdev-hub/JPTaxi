import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'メールアドレスの形式が正しくありません。' })
  @IsNotEmpty({ message: 'メールアドレスを入力してください。' })
  email: string;
}
