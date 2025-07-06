'use server';
/**
 * @fileOverview Flow for generating differentiated worksheets based on a textbook page image.
 *
 * - generateDifferentiatedWorksheets - Function to generate differentiated worksheets.
 * - GenerateDifferentiatedWorksheetsInput - Input type for the function.
 * - GenerateDifferentiatedWorksheetsOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDifferentiatedWorksheetsInputSchema = z.object({
  textbookPageImage: z
    .string()
    .describe(
      "A photo of a textbook page, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  gradeLevels: z
    .string()
    .describe('Comma-separated list of grade levels (e.g., 3,4,5).'),
  additionalDetails: z
    .string()
    .optional()
    .describe('Additional instructions from the teacher to tailor the worksheet.'),
});
export type GenerateDifferentiatedWorksheetsInput = z.infer<
  typeof GenerateDifferentiatedWorksheetsInputSchema
>;

const GenerateDifferentiatedWorksheetsOutputSchema = z.object({
  worksheets: z.array(
    z.object({
      gradeLevel: z.string().describe('The grade level of the worksheet.'),
      worksheetContent: z
        .string()
        .describe('The content of the generated worksheet.'),
    })
  ),
});
export type GenerateDifferentiatedWorksheetsOutput = z.infer<
  typeof GenerateDifferentiatedWorksheetsOutputSchema
>;

export async function generateDifferentiatedWorksheets(
  input: GenerateDifferentiatedWorksheetsInput
): Promise<GenerateDifferentiatedWorksheetsOutput> {
  return generateDifferentiatedWorksheetsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDifferentiatedWorksheetsPrompt',
  input: {schema: GenerateDifferentiatedWorksheetsInputSchema},
  output: {schema: GenerateDifferentiatedWorksheetsOutputSchema},
  prompt: `You are an expert educator specializing in creating differentiated worksheets for multi-grade classrooms in India.

You will receive an image of a textbook page and a list of grade levels.
Your task is to generate a worksheet tailored to each specified grade level, adapting the content and complexity appropriately.
Consider the Indian context while generating content. For example, if the content on the textbook page discusses rice harvesting, create question with realistic scenarios for rice harvesting in India.

Textbook Page Image: {{media url=textbookPageImage}}
Grade Levels: {{{gradeLevels}}}
{{#if additionalDetails}}
Additional Details from the teacher: {{{additionalDetails}}}
{{/if}}

Output a JSON array of worksheets, one for each grade level.
`,
});

const generateDifferentiatedWorksheetsFlow = ai.defineFlow(
  {
    name: 'generateDifferentiatedWorksheetsFlow',
    inputSchema: GenerateDifferentiatedWorksheetsInputSchema,
    outputSchema: GenerateDifferentiatedWorksheetsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
