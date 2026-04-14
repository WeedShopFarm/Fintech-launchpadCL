import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { AuthDto } from './dto/index';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(authDto: AuthDto) {
    // Registration logic here
  }

  async login(authDto: AuthDto) {
    // Login logic here
  }

  async validateUser(username: string, pass: string): Promise<any> {
    // User validation logic here
  }

  async generateToken(userId: string) {
    return this.jwtService.sign({ id: userId });
  }
}