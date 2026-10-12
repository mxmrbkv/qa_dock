import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { KeycloakCallbackDto, KeycloakTokenDto } from './dto/keycloak.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('keycloak/config')
  getKeycloakConfig() {
    return this.authService.getKeycloakConfig();
  }

  @Post('keycloak/callback')
  @HttpCode(HttpStatus.OK)
  async keycloakCallback(@Body() dto: KeycloakCallbackDto) {
    return this.authService.handleKeycloakCallback(dto);
  }

  @Post('keycloak/token')
  @HttpCode(HttpStatus.OK)
  async keycloakToken(@Body() dto: KeycloakTokenDto) {
    return this.authService.handleKeycloakToken(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
