import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Введите email или имя пользователя' })
  @IsString()
  email: string;

  @IsNotEmpty({ message: 'Введите пароль' })
  @IsString()
  password: string;
}
