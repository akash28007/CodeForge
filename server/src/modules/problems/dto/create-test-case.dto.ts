import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateTestCaseDto {
  @IsString()
  input!: string;

  @IsString()
  expectedOutput!: string;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}
