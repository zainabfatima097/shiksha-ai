"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateLessonPlan, GenerateLessonPlanInput } from '@/ai/flows/ai-lesson-planner';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SidebarTrigger } from '@/components/ui/sidebar';
import ReactMarkdown from 'react-markdown';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const lessonPlannerSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().min(1, 'Topic is required'),
  gradeLevel: z.string().min(1, 'Grade level is required'),
  learningObjectives: z.string().min(1, 'Learning objectives are required'),
  localLanguage: z.string().min(1, 'Language is required'),
  additionalDetails: z.string().optional(),
});

type LessonPlannerFormValues = z.infer<typeof lessonPlannerSchema>;

export default function LessonPlannerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [lessonPlan, setLessonPlan] = useState('');
  const [history, setHistory] = useState<LessonPlannerFormValues[]>([]);
  const { toast } = useToast();

  const form = useForm<LessonPlannerFormValues>({
    resolver: zodResolver(lessonPlannerSchema),
    defaultValues: {
      subject: '',
      topic: '',
      gradeLevel: '',
      learningObjectives: '',
      localLanguage: 'English',
      additionalDetails: '',
    },
  });

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('lessonPlanHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('lessonPlanHistory', JSON.stringify(history));
    } catch (error) {
        console.error("Failed to save history to localStorage", error);
    }
  }, [history]);

  async function onSubmit(values: LessonPlannerFormValues) {
    setHistory(prevHistory => {
        const newHistory = [values, ...prevHistory.filter(item => JSON.stringify(item) !== JSON.stringify(values))];
        return newHistory.slice(0, 5);
    });

    setIsLoading(true);
    setLessonPlan('');
    try {
      const result = await generateLessonPlan(values as GenerateLessonPlanInput);
      setLessonPlan(result.weeklyPlan);
    } catch (error) {
      console.error('Error generating lesson plan:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate lesson plan. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleHistoryClick = (item: LessonPlannerFormValues) => {
    form.reset(item);
    setLessonPlan('');
  };

  return (
    <div className="flex flex-col h-full">
       <header className="flex items-center justify-between p-4 border-b md:hidden">
            <h1 className="font-headline text-xl font-bold text-primary">Lesson Planner</h1>
            <SidebarTrigger />
        </header>
      <div className="flex-1 p-4 md:p-8 overflow-auto">
        {history.length > 0 && (
          <div className="max-w-4xl mx-auto mb-8">
            <h2 className="text-2xl font-headline mb-4 text-primary">Recent Plans</h2>
            <Carousel opts={{ align: "start", loop: false }} className="w-full">
              <CarouselContent className="-ml-2">
                {history.map((item, index) => (
                  <CarouselItem key={index} className="pl-2 md:basis-1/2 lg:basis-1/3">
                    <div className="p-1">
                      <Card
                        className="bg-primary/10 hover:bg-primary/20 cursor-pointer transition-colors h-full"
                        onClick={() => handleHistoryClick(item)}
                      >
                        <CardHeader>
                          <CardTitle className="text-lg font-bold truncate" title={item.topic}>{item.topic}</CardTitle>
                          <CardDescription>{item.gradeLevel} &middot; {item.subject}</CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex" />
              <CarouselNext className="hidden sm:flex" />
            </Carousel>
          </div>
        )}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">AI Lesson Planner</CardTitle>
            <CardDescription>Generate a detailed weekly lesson plan for your class.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Science" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="topic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Topic</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., The Water Cycle" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gradeLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grade Level</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 4th Grade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="localLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Hindi">Hindi</SelectItem>
                            <SelectItem value="Marathi">Marathi</SelectItem>
                            <SelectItem value="Bengali">Bengali</SelectItem>
                            <SelectItem value="Tamil">Tamil</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="learningObjectives"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Learning Objectives</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Students will be able to describe the stages of the water cycle." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="additionalDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Details (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Focus on local examples of water sources." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
                  Generate Plan
                </Button>
              </form>
            </Form>
          </CardContent>
          {lessonPlan && (
             <CardFooter>
              <Card className="w-full bg-secondary/50">
                <CardHeader>
                  <CardTitle className="font-headline text-xl">Your Weekly Lesson Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{lessonPlan}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
             </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
