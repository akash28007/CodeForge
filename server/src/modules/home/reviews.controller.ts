import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HomeService } from './home.service';
import { SubmitReviewDto } from './dto/home.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../utils/current-user.decorator';
import { JwtPayload } from '../../types/jwt-payload.interface';

/**
 * Reviews written by users, as opposed to the admin-authored rows under
 * `/admin/home/reviews`.
 *
 * Nothing here can publish anything: every submission lands PENDING and unpublished,
 * and only an admin can move it. That is the whole point of the split — a public write
 * endpoint that could make content appear on the landing page would be an open door.
 */
@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly home: HomeService) {}

  @Get('mine')
  @ApiOperation({ summary: 'Your own review and its moderation status, or null' })
  mine(@CurrentUser() user: JwtPayload) {
    return this.home.myReview(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a review for admin approval' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(@CurrentUser() user: JwtPayload, @Body() dto: SubmitReviewDto) {
    return this.home.submitReview(user.sub, dto);
  }

  @Patch('mine')
  @ApiOperation({ summary: 'Edit your review while it is still pending' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  update(@CurrentUser() user: JwtPayload, @Body() dto: SubmitReviewDto) {
    return this.home.updateMyReview(user.sub, dto);
  }

  @Delete('mine')
  @ApiOperation({ summary: 'Withdraw your pending review' })
  withdraw(@CurrentUser() user: JwtPayload) {
    return this.home.withdrawMyReview(user.sub);
  }
}
