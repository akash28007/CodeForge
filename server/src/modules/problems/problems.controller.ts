import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ProblemsService } from './problems.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { QueryProblemsDto } from './dto/query-problems.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../utils/roles.decorator';
import { CurrentUser } from '../../utils/current-user.decorator';
import { JwtPayload } from '../../types/jwt-payload.interface';

@Controller()
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  /** Public, but personalised (solved/bookmarked flags) when a token is supplied. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('problems')
  findAll(@Query() query: QueryProblemsDto, @CurrentUser() user?: JwtPayload) {
    return this.problemsService.findAll(query, user?.sub);
  }

  /** Sidebar facet counts, honouring the currently active search. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('problems/facets')
  facets(@Query() query: QueryProblemsDto, @CurrentUser() user?: JwtPayload) {
    return this.problemsService.facets(query, user?.sub);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('problem/:id')
  findOne(@Param('id') id: string, @CurrentUser() user?: JwtPayload) {
    return this.problemsService.findOne(id, user?.sub, user?.role === Role.ADMIN);
  }

  /** Gated: fetching the editorial records that this user read it. */
  @UseGuards(JwtAuthGuard)
  @Get('problem/:id/editorial')
  editorial(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.problemsService.editorial(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('problem/:id/submissions')
  submissionsForProblem(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.problemsService.submissionsForProblem(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('problem/:id/bookmark')
  addBookmark(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.problemsService.setBookmark(id, user.sub, true);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('problem/:id/bookmark')
  removeBookmark(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.problemsService.setBookmark(id, user.sub, false);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('problem')
  create(@Body() dto: CreateProblemDto, @CurrentUser() user: JwtPayload) {
    return this.problemsService.create(dto, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put('problem/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProblemDto) {
    return this.problemsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('problem/:id')
  remove(@Param('id') id: string) {
    return this.problemsService.remove(id);
  }
}
