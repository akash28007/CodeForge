import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeAdminController } from './home-admin.controller';
import { HomeService } from './home.service';

@Module({
  controllers: [HomeController, HomeAdminController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}
