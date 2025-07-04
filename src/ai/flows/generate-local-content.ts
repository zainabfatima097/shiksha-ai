'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating hyper-local content in the teacher's local language.
 *
 * - generateLocalContent - A function that takes a prompt in the local language and returns culturally relevant content.
 * - GenerateLocalContentInput - The input type for the generateLocalContent function.
 * - GenerateLocalContentOutput - The return type for the generateLocalContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLocalContentInputSchema = z.object({
  prompt: z
    .string()
    .describe(
      'A prompt in the local language requesting culturally relevant content.'
    ),
  language: z.string().describe('The local language of the prompt.'),
});
export type GenerateLocalContentInput = z.infer<typeof GenerateLocalContentInputSchema>;

const GenerateLocalContentOutputSchema = z.object({
  content: z
    .string()
    .describe('The generated culturally relevant content in the local language.'),
});
export type GenerateLocalContentOutput = z.infer<typeof GenerateLocalContentOutputSchema>;

export async function generateLocalContent(
  input: GenerateLocalContentInput
): Promise<GenerateLocalContentOutput> {
  return generateLocalContentFlow(input);
}

const generateLocalContentPrompt = ai.definePrompt({
  name: 'generateLocalContentPrompt',
  input: {schema: GenerateLocalContentInputSchema},
  output: {schema: GenerateLocalContentOutputSchema},
  prompt: `You are an expert in generating hyper-local content for teachers in India. You are able to understand multiple languages spoken in India.

  A teacher has requested the following content in their local language ({{{language}}}):

  {{prompt}}

  Generate simple, culturally relevant content that is easy to understand and useful for teaching students. Incorporate analogies, farmer's tales, or other relevant cultural references to make the content engaging and relatable. The response must be in the same language the teacher used to make the request.
  `,
});

const generateLocalContentFlow = ai.defineFlow(
  {
    name: 'generateLocalContentFlow',
    inputSchema: GenerateLocalContentInputSchema,
    outputSchema: GenerateLocalContentOutputSchema,
  },
  async input => {
    const {output} = await generateLocalContentPrompt(input);
    return output!;
  }
);
