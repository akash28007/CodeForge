import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class SubmitCodeDto {
  @IsUUID()
  problemId!: string;

  @IsString()
  @MinLength(1)
  code!: string;

  @IsOptional()
  @IsIn(['cpp'])
  language?: string;
}
