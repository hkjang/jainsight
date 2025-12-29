
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role, Permission, RbacPolicy, UserRole, GroupRole, RoleResource } from './entities';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Role, Permission, RbacPolicy, UserRole, GroupRole, RoleResource])],
    controllers: [RbacController],
    providers: [RbacService],
    exports: [RbacService],
})
export class RbacModule { }
