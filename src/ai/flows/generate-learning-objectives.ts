
'use server';
/**
 * @fileOverview Flow for generating learning objectives for a lesson plan.
 *
 * - generateLearningObjectives - A function that generates learning objectives based on a topic and grade level.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateLearningObjectivesInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate learning objectives.'),
  gradeLevel: z.string().describe('The grade level of the students.'),
});
type GenerateLearningObjectivesInput = z.infer<
  typeof GenerateLearningObjectivesInputSchema
>;

const GenerateLearningObjectivesOutputSchema = z.object({
  learningObjectives: z
    .string()
    .describe('A short, bulleted list of learning objectives.'),
});
export type GenerateLearningObjectivesOutput = z.infer<
  typeof GenerateLearningObjectivesOutputSchema
>;

export async function generateLearningObjectives(
  input: GenerateLearningObjectivesInput
): Promise<GenerateLearningObjectivesOutput> {
  return generateLearningObjectivesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLearningObjectivesPrompt',
  input: {schema: GenerateLearningObjectivesInputSchema},
  output: {schema: GenerateLearningObjectivesOutputSchema},
  prompt: `You are an expert curriculum designer.
For the given topic and grade level, generate a short, bulleted list of 2-4 key learning objectives.
The objectives should be clear, concise, and action-oriented. Start each bullet point with "Students will be able to...".

Topic: {{{topic}}}
Grade Level: {{{gradeLevel}}}

Output your response as a single string with each objective on a new line, like this:
- Students will be able to...
- Students will be able to...
`,
});

const generateLearningObjectivesFlow = ai.defineFlow(
  {
    name: 'generateLearningObjectivesFlow',
    inputSchema: GenerateLearningObjectivesInputSchema,
    outputSchema: GenerateLearningObjectivesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);

    if (!output) {
      throw new Error('Failed to generate learning objectives.');
    }
    return output;
  }
);
