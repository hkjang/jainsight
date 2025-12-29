
import { Injectable, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthResponseDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByEmail(email);
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any): Promise<AuthResponseDto> {
        const payload = { username: user.email, sub: user.id, role: user.role };
        return {
            accessToken: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        };
    }

    async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
        // Check if user already exists
        const existingUser = await this.usersService.findOneByEmail(registerDto.email);
        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        const user = await this.usersService.create({
            ...registerDto,
            password: hashedPassword
        });

        // Return login response for new user
        return this.login(user);
    }
}
