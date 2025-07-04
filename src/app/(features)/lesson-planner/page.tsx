
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateLessonPlan, LessonPlanHistoryItem } from '@/ai/flows/ai-lesson-planner';
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
import { Download } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';


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
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [lessonPlan, setLessonPlan] = useState('');
  const [history, setHistory] = useState<LessonPlanHistoryItem[]>([]);
  const { toast } = useToast();
  const { user, profile, loading: authLoading } = useAuth();
  const lessonPlanRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'teacher') {
        router.replace('/profile');
    }
  }, [authLoading, profile, router]);

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

  const fetchHistory = useCallback(async (uid: string) => {
    if (!db) {
        console.error("Firestore is not initialized. Cannot fetch history.");
        return;
    }
    setIsHistoryLoading(true);
    try {
        const historyRef = collection(db, 'teachers', uid, 'lessonHistory');
        const q = query(historyRef, orderBy('createdAt', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);

        const historyData: LessonPlanHistoryItem[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.subject && data.topic && data.gradeLevel && data.learningObjectives && data.localLanguage) {
                historyData.push({
                    subject: data.subject,
                    topic: data.topic,
                    gradeLevel: data.gradeLevel,
                    learningObjectives: data.learningObjectives,
                    localLanguage: data.localLanguage,
                    additionalDetails: data.additionalDetails || '',
                });
            }
        });
        setHistory(historyData);
    } catch (error: any) {
        console.error("Failed to fetch history from database", error);
        let description = 'Could not load your recent plans. An unknown error occurred.';
         if (error.code === 'failed-precondition') {
            description = `A Firestore index is required. Please create it in your Firebase console. The error was: "${error.message}"`;
        } else if (error.code === 'permission-denied') {
            description = 'Permission denied. Please check your Firestore security rules to ensure you can read from the "lessonHistory" collection.';
        }
        toast({ 
            variant: 'destructive', 
            title: 'Error Loading History', 
            description: description,
            duration: 9000,
        });
    } finally {
        setIsHistoryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user && profile?.role === 'teacher') {
      fetchHistory(user.uid);
    } else if (!authLoading) {
      setIsHistoryLoading(false);
    }
  }, [user, profile, authLoading, fetchHistory]);


  async function onSubmit(values: LessonPlannerFormValues) {
    if (!user || !db) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be signed in to generate a lesson plan."
      });
      return;
    }

    setIsLoading(true);
    setLessonPlan('');
    try {
      const result = await generateLessonPlan(values);
      setLessonPlan(result.weeklyPlan);

      try {
        const historyRef = collection(db, 'teachers', user.uid, 'lessonHistory');
        await addDoc(historyRef, {
            ...values,
            createdAt: serverTimestamp()
        });
        // Refetch history after successful save
        await fetchHistory(user.uid);
      } catch (historyError: any) {
        console.error("Failed to save lesson plan history:", historyError);
        toast({
            variant: 'destructive',
            title: 'Could Not Save History',
            description: `An error occurred while saving: ${historyError.message}. Please check your Firestore security rules.`,
            duration: 9000,
        });
      }

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

  const handleExportToPdf = () => {
    const input = lessonPlanRef.current;
    if (!input) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not find the lesson plan content to export.',
      });
      return;
    }

    setIsLoading(true);
    html2canvas(input, { scale: 2, useCORS: true })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;
        
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        
        pdf.addImage(
          imgData,
          'PNG',
          imgX,
          0,
          imgWidth * ratio,
          imgHeight * ratio
        );
        pdf.save('lesson-plan.pdf');
      })
      .catch((error) => {
        console.error('Error generating PDF:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to export lesson plan as PDF. Please try again.',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (authLoading || !profile || profile.role !== 'teacher') {
    return (
        <div className="flex items-center justify-center h-full">
            <LoadingSpinner className="h-12 w-12" />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
       <header className="flex items-center justify-between p-4 border-b md:hidden">
            <h1 className="font-headline text-xl font-bold text-primary">Lesson Planner</h1>
            <SidebarTrigger />
        </header>
      <div className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto mb-8">
            <h2 className="text-2xl font-headline mb-4 text-primary">Recent Plans</h2>
            {isHistoryLoading ? (
                <div className="flex space-x-4">
                <Skeleton className="h-28 flex-1 rounded-lg" />
                <Skeleton className="h-28 flex-1 rounded-lg md:block hidden" />
                <Skeleton className="h-28 flex-1 rounded-lg lg:block hidden" />
                </div>
            ) : history.length > 0 ? (
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
            ) : (
                <Card className="bg-secondary/50 border-dashed">
                    <CardContent className="p-6">
                        <p className="text-center text-muted-foreground">You have no recent lesson plans. Generate one below to get started!</p>
                    </CardContent>
                </Card>
            )}
        </div>

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
              <Card className="w-full bg-secondary/50" ref={lessonPlanRef}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="font-headline text-xl">Your Weekly Lesson Plan</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleExportToPdf}
                      disabled={isLoading}
                      aria-label="Export to PDF"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>
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
