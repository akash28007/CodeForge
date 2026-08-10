import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { QueryResourcesDto, SetStepCompletionDto } from './dto/resources.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../utils/current-user.decorator';
import { JwtPayload } from '../../types/jwt-payload.interface';

/**
 * Public Resources directory (guide §9). Browsing needs no account; learning-path
 * progress is personalised when a token happens to be present.
 */
@ApiTags('resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Published categories with their resource counts' })
  categories() {
    return this.resources.categories();
  }

  @Get()
  @ApiOperation({ summary: 'Published resources, filterable by category, type and search' })
  list(@Query() query: QueryResourcesDto) {
    return this.resources.list(query);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('paths')
  @ApiOperation({ summary: 'Learning paths, with per-step completion when signed in' })
  paths(@CurrentUser() user?: JwtPayload) {
    return this.resources.paths(user?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('paths/steps/:stepId')
  @ApiOperation({ summary: 'Tick or untick a resource step (problem steps are judged, not ticked)' })
  setStep(
    @Param('stepId') stepId: string,
    @Body() dto: SetStepCompletionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resources.setStepCompletion(stepId, user.sub, dto.completed);
  }

  // Declared last so it can't shadow `/categories` or `/paths`.
  @Get(':slug')
  @ApiOperation({ summary: 'One resource, including the body for locally-authored sheets' })
  bySlug(@Param('slug') slug: string) {
    return this.resources.bySlug(slug);
  }
}
