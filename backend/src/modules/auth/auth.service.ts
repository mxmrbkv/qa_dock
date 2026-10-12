import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { KeycloakCallbackDto, KeycloakTokenDto } from './dto/keycloak.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role || 'QA_ENGINEER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user,
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const loginIdentifier = dto.email.trim();

    // 1. Authenticate against Keycloak via Direct Grant (no redirect required)
    try {
      const keycloakInternalUrl = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
      const realm = process.env.KEYCLOAK_REALM || 'qa-dock';
      const clientId = process.env.KEYCLOAK_CLIENT_ID || 'qa-dock-client';

      const tokenEndpoint = `${keycloakInternalUrl}/realms/${realm}/protocol/openid-connect/token`;
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('client_id', clientId);
      params.append('username', loginIdentifier);
      params.append('password', dto.password);
      params.append('scope', 'openid profile email');

      const kcRes = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (kcRes.ok) {
        const tokenData = await kcRes.json();
        return await this.processKeycloakAccessToken(tokenData.access_token, tokenData.refresh_token);
      }
    } catch (kcErr: any) {
      this.logger.warn(`Keycloak direct grant authentication attempt failed: ${kcErr.message}`);
    }

    // 2. Fallback to local database authentication
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: loginIdentifier.toLowerCase() },
          { name: loginIdentifier },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken: token,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        projectMembers: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  getKeycloakConfig() {
    const keycloakPublicUrl = process.env.KEYCLOAK_PUBLIC_URL || 'http://localhost:8080';
    const realm = process.env.KEYCLOAK_REALM || 'qa-dock';
    const clientId = process.env.KEYCLOAK_CLIENT_ID || 'qa-dock-client';

    return {
      enabled: true,
      url: keycloakPublicUrl,
      realm,
      clientId,
      authUrl: `${keycloakPublicUrl}/realms/${realm}/protocol/openid-connect/auth`,
      logoutUrl: `${keycloakPublicUrl}/realms/${realm}/protocol/openid-connect/logout`,
    };
  }

  async handleKeycloakCallback(dto: KeycloakCallbackDto) {
    const keycloakInternalUrl = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
    const realm = process.env.KEYCLOAK_REALM || 'qa-dock';
    const clientId = process.env.KEYCLOAK_CLIENT_ID || 'qa-dock-client';

    const tokenEndpoint = `${keycloakInternalUrl}/realms/${realm}/protocol/openid-connect/token`;

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', clientId);
    params.append('code', dto.code);
    params.append('redirect_uri', dto.redirectUri);

    let tokenResponse;
    try {
      const res = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`Keycloak token exchange failed (${res.status}): ${errorText}`);
        throw new UnauthorizedException(`Keycloak token exchange failed: ${errorText}`);
      }

      tokenResponse = await res.json();
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException(`Failed to connect to Keycloak service: ${err.message}`);
    }

    return this.processKeycloakAccessToken(tokenResponse.access_token, tokenResponse.refresh_token);
  }

  async handleKeycloakToken(dto: KeycloakTokenDto) {
    return this.processKeycloakAccessToken(dto.accessToken);
  }

  async processKeycloakAccessToken(accessToken: string, refreshToken?: string) {
    const keycloakInternalUrl = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
    const realm = process.env.KEYCLOAK_REALM || 'qa-dock';

    const userinfoEndpoint = `${keycloakInternalUrl}/realms/${realm}/protocol/openid-connect/userinfo`;

    let userInfo: any;
    try {
      const res = await fetch(userinfoEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new UnauthorizedException('Invalid Keycloak access token');
      }

      userInfo = await res.json();
    } catch (err: any) {
      throw new UnauthorizedException(`Failed to verify Keycloak token: ${err.message}`);
    }

    // Inspect roles in Keycloak token
    let isAdmin = false;
    try {
      const parts = accessToken.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadJson);
        const roles = payload.realm_access?.roles || [];
        if (roles.includes('admin') || roles.includes('ADMIN')) {
          isAdmin = true;
        }
      }
    } catch (e) {
      // ignore parse error
    }

    const email = (userInfo.email || `${userInfo.preferred_username || userInfo.sub}@qadock.dev`).toLowerCase();
    const name = userInfo.name || userInfo.preferred_username || email.split('@')[0];

    // Find or upsert user in QA Dock PostgreSQL database
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name,
          email,
          passwordHash: 'KEYCLOAK_MANAGED_USER',
          role: isAdmin ? 'ADMIN' : 'QA_ENGINEER',
        },
      });
    } else if (isAdmin && user.role !== 'ADMIN') {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
    }

    const appToken = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken: appToken,
      keycloakToken: accessToken,
      keycloakRefreshToken: refreshToken,
    };
  }

  private generateToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
    });
  }
}
