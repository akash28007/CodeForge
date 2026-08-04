import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmitCodeDto } from './dto/submit-code.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../utils/current-user.decorator';
import { JwtPayload } from '../../types/jwt-payload.interface';

@UseGuards(JwtAuthGuard)
@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('submission')
  submit(@Body() dto: SubmitCodeDto, @CurrentUser() user: JwtPayload) {
    return this.submissionsService.submit(dto, user.sub);
  }

  @Post('run')
  runSample(@Body() dto: SubmitCodeDto) {
    return this.submissionsService.runSample(dto);
  }

  @Get('submission/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.submissionsService.findOne(id, user);
  }

  @Get('submissions')
  findAllForCurrentUser(@CurrentUser() user: JwtPayload) {
    return this.submissionsService.findAllForCurrentUser(user.sub);
  }
}
