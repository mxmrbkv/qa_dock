import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class KeycloakCallbackDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  redirectUri: string;
}

export class KeycloakTokenDto {
  @IsNotEmpty()
  @IsString()
  accessToken: string;
}
