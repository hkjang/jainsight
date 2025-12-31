
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserActivity } from './entities/user-activity.entity';
import { UserSession } from './entities/user-session.entity';
import { UserNotification } from './entities/user-notification.entity';
import { UserFavorite } from './entities/user-favorite.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, UserActivity, UserSession, UserNotification, UserFavorite])],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }

