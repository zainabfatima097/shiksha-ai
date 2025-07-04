'use server';

/**
 * @fileOverview A lesson plan generator AI agent.
 *
 * - generateLessonPlan - A function that handles the lesson plan generation process.
 * - getLessonPlanHistory - A function to retrieve the user's last 5 lesson plans.
 * - LessonPlanHistoryItem - The type for a single item in the lesson plan history, and the input for generation.
 * - GenerateLessonPlanOutput - The return type for the generateLessonPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';


const LessonPlanDataSchema = z.object({
  subject: z.string().describe('The subject of the lesson plan.'),
  topic: z.string().describe('The specific topic for the week.'),
  gradeLevel: z.string().describe('The grade level of the students.'),
  learningObjectives: z.string().describe('The learning objectives for the week.'),
  localLanguage: z.string().describe('The local language for the lesson plan.'),
  additionalDetails: z.string().optional().describe('Any additional details or context for the lesson plan.'),
});

export type LessonPlanHistoryItem = z.infer<typeof LessonPlanDataSchema>;


const GenerateLessonPlanOutputSchema = z.object({
  weeklyPlan: z.string().describe('A detailed weekly lesson plan in Markdown format.'),
});
export type GenerateLessonPlanOutput = z.infer<typeof GenerateLessonPlanOutputSchema>;


export async function generateLessonPlan(input: LessonPlanHistoryItem): Promise<GenerateLessonPlanOutput> {
  return generateLessonPlanFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateLessonPlanPrompt',
  input: {schema: LessonPlanDataSchema},
  output: {schema: GenerateLessonPlanOutputSchema},
  prompt: `You are an experienced teacher creating a weekly lesson plan.

Please generate a detailed and well-structured weekly lesson plan based on the following details.
The lesson plan should be written in {{{localLanguage}}}.

Subject: {{{subject}}}
Topic: {{{topic}}}
Grade Level: {{{gradeLevel}}}
Learning Objectives: {{{learningObjectives}}}
Additional Details: {{{additionalDetails}}}

The lesson plan must be a single, well-formatted Markdown string. It should be easy to follow and implement in a low-resource environment.
Use Markdown for headings, lists, bold text, etc. to structure the plan. For example:

# Weekly Lesson Plan: [Topic]

## Day 1: Introduction
*   **Objective:** ...
*   **Activity:** ...
*   **Resources:** ...

## Day 2: ...

Your final response must be a JSON object with a single key "weeklyPlan" that contains the entire lesson plan as a Markdown string.
`,
});


const generateLessonPlanFlow = ai.defineFlow({
  name: 'generateLessonPlanFlow',
  inputSchema: LessonPlanDataSchema,
  outputSchema: GenerateLessonPlanOutputSchema,
},
async (input) => {
    const { output } = await prompt(input);

    if (!output) {
      throw new Error("Failed to generate lesson plan from AI. The model did not return the expected output format.");
    }
    return output;
});


export async function getLessonPlanHistory(uid: string): Promise<LessonPlanHistoryItem[]> {
    if (!db) {
        console.error("Firestore is not initialized, cannot fetch history.");
        return [];
    }
    try {
        const historyRef = collection(db, 'teachers', uid, 'lessonHistory');
        const q = query(historyRef, orderBy('createdAt', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);

        const history: LessonPlanHistoryItem[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            history.push({
                subject: data.subject,
                topic: data.topic,
                gradeLevel: data.gradeLevel,
                learningObjectives: data.learningObjectives,
                localLanguage: data.localLanguage,
                additionalDetails: data.additionalDetails || '',
            });
        });
        return history;
    } catch (error) {
        console.error("Failed to fetch lesson plan history:", error);
        // On error, return an empty array to avoid breaking the UI.
        return [];
    }
}
