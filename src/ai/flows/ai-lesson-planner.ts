'use server';

/**
 * @fileOverview A lesson plan generator AI agent.
 *
 * - generateLessonPlan - A function that handles the lesson plan generation process.
 * - GenerateLessonPlanInput - The input type for the generateLessonPlan function.
 * - GenerateLessonPlanOutput - The return type for the generateLessonPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLessonPlanInputSchema = z.object({
  subject: z.string().describe('The subject of the lesson plan.'),
  topic: z.string().describe('The specific topic for the week.'),
  gradeLevel: z.string().describe('The grade level of the students.'),
  learningObjectives: z.string().describe('The learning objectives for the week.'),
  localLanguage: z.string().describe('The local language for the lesson plan.'),
  additionalDetails: z.string().optional().describe('Any additional details or context for the lesson plan.'),
});

export type GenerateLessonPlanInput = z.infer<typeof GenerateLessonPlanInputSchema>;

const GenerateLessonPlanOutputSchema = z.object({
  weeklyPlan: z.string().describe('A detailed weekly lesson plan in Markdown format.'),
});

export type GenerateLessonPlanOutput = z.infer<typeof GenerateLessonPlanOutputSchema>;

export async function generateLessonPlan(input: GenerateLessonPlanInput): Promise<GenerateLessonPlanOutput> {
  return generateLessonPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLessonPlanPrompt',
  input: {schema: GenerateLessonPlanInputSchema},
  output: {schema: GenerateLessonPlanOutputSchema},
  prompt: `You are an experienced teacher creating a weekly lesson plan for the following subject, topic and grade level.
Subject: {{{subject}}}
Topic: {{{topic}}}
Grade Level: {{{gradeLevel}}}
Learning Objectives: {{{learningObjectives}}}
Local Language: {{{localLanguage}}}
Additional Details: {{{additionalDetails}}}

Create a detailed and well-structured weekly lesson plan that includes specific activities, resources, and assessment methods. Please return it in the local language.
The output should be formatted as a single Markdown string. The lesson plan should be easy to follow and implement in a low-resource environment.
Use Markdown for headings, lists, bold text, etc. to structure the plan. For example:

# Weekly Lesson Plan: [Topic]

## Day 1: Introduction
*   **Objective:** ...
*   **Activity:** ...
*   **Resources:** ...

## Day 2: ...
`,
});

const generateLessonPlanFlow = ai.defineFlow({
  name: 'generateLessonPlanFlow',
  inputSchema: GenerateLessonPlanInputSchema,
  outputSchema: GenerateLessonPlanOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});
