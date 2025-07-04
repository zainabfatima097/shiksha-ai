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
        // This is a critical configuration error.
        console.error("Firestore is not initialized. Cannot fetch history.");
        throw new Error("Firestore is not configured. Please check your Firebase setup.");
    }

    try {
        const historyRef = collection(db, 'teachers', uid, 'lessonHistory');
        const q = query(historyRef, orderBy('createdAt', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);

        const history: LessonPlanHistoryItem[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Basic validation to prevent crashes if data is malformed
            if (data.subject && data.topic && data.gradeLevel && data.learningObjectives && data.localLanguage) {
                history.push({
                    subject: data.subject,
                    topic: data.topic,
                    gradeLevel: data.gradeLevel,
                    learningObjectives: data.learningObjectives,
                    localLanguage: data.localLanguage,
                    additionalDetails: data.additionalDetails || '',
                });
            }
        });
        return history;
    } catch (error: any) {
        console.error("Firestore error fetching lesson plan history:", error);

        if (error.code === 'failed-precondition') {
            // This is the specific error for a missing index.
            // The error message from Firebase includes a URL to create the index.
            throw new Error(`A Firestore index is required. The error from Firebase is: "${error.message}" Please check the browser console for a link to create the index automatically.`);
        }
        
        if (error.code === 'permission-denied') {
            // This is a security rules issue.
            throw new Error('Permission denied. Please check your Firestore security rules to ensure you can read from the "lessonHistory" collection.');
        }

        // For any other type of error, throw a generic message.
        throw new Error('An unexpected error occurred while fetching your lesson plan history.');
    }
}
