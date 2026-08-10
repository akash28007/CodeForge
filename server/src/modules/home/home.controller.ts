import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HomeService } from './home.service';
import { SubscribeDto } from './dto/home.dto';

/**
 * Public homepage content. No guard: the landing page has to render for signed-out
 * visitors, and everything here is content an admin published deliberately.
 */
@ApiTags('home')
@Controller()
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get('home')
  @ApiOperation({ summary: 'Homepage + footer content (public, published rows only)' })
  getHome() {
    return this.home.publicContent();
  }

  // Unauthenticated writes get a much tighter budget than the global 100/min: this
  // endpoint inserts a row on behalf of an anonymous caller, so it is the obvious
  // thing to point a script at.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('newsletter')
  @HttpCode(200)
  @ApiOperation({ summary: 'Subscribe an email address to the newsletter' })
  subscribe(@Body() dto: SubscribeDto) {
    return this.home.subscribe(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('newsletter/unsubscribe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Unsubscribe an email address' })
  unsubscribe(@Body() dto: SubscribeDto) {
    return this.home.unsubscribe(dto);
  }
}
