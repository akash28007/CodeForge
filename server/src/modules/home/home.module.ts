import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeAdminController } from './home-admin.controller';
import { ReviewsController } from './reviews.controller';
import { HomeService } from './home.service';

@Module({
  controllers: [HomeController, HomeAdminController, ReviewsController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}
