-- AlterTable
ALTER TABLE "HomeContent" ADD COLUMN     "howHeading" TEXT NOT NULL DEFAULT 'How CodeForge works',
ADD COLUMN     "howStep1Body" TEXT NOT NULL DEFAULT 'Filter by topic, difficulty or what you have not solved yet. Every problem states its limits up front.',
ADD COLUMN     "howStep1Title" TEXT NOT NULL DEFAULT 'Pick a problem',
ADD COLUMN     "howStep2Body" TEXT NOT NULL DEFAULT 'Draft in the editor and run against the sample input before you commit to a submission.',
ADD COLUMN     "howStep2Title" TEXT NOT NULL DEFAULT 'Write and run C++',
ADD COLUMN     "howStep3Body" TEXT NOT NULL DEFAULT 'Your code compiles and runs in an isolated container against hidden tests, with real time and memory limits.',
ADD COLUMN     "howStep3Title" TEXT NOT NULL DEFAULT 'Get judged for real',
ADD COLUMN     "statsHeading" TEXT NOT NULL DEFAULT 'CodeForge by the numbers',
ADD COLUMN     "topicsHeading" TEXT NOT NULL DEFAULT 'Practise by topic';
