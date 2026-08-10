import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Difficulty } from '@prisma/client';
import { CreateTestCaseDto } from './create-test-case.dto';

export class CreateProblemDto {
  @IsString()
  title!: string;

  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @IsString()
  statement!: string;

  /** Optional admin-authored walkthrough, served only from the gated editorial route. */
  @IsOptional()
  @IsString()
  editorial?: string;

  @IsString()
  constraints!: string;

  @IsString()
  inputFormat!: string;

  @IsString()
  outputFormat!: string;

  @IsString()
  sampleInput!: string;

  @IsString()
  sampleOutput!: string;

  @IsInt()
  @Min(1)
  timeLimit!: number;

  @IsInt()
  @Min(1)
  memoryLimit!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTestCaseDto)
  testCases!: CreateTestCaseDto[];
}
