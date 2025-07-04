"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { generateDifferentiatedWorksheets, GenerateDifferentiatedWorksheetsOutput } from '@/ai/flows/generate-differentiated-worksheets';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';


const worksheetsSchema = z.object({
  textbookPageImage: z.string().min(1, 'Please upload an image.'),
  gradeLevels: z.string().min(1, 'Please enter grade levels.').regex(/^\d+(,\s*\d+)*$/, 'Please enter comma-separated numbers (e.g., 3, 4, 5)'),
});

export default function DifferentiatedWorksheetsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [worksheets, setWorksheets] = useState<GenerateDifferentiatedWorksheetsOutput['worksheets']>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();


  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'teacher') {
        router.replace('/profile');
    }
  }, [authLoading, profile, router]);


  const form = useForm<z.infer<typeof worksheetsSchema>>({
    resolver: zodResolver(worksheetsSchema),
    defaultValues: {
      textbookPageImage: '',
      gradeLevels: '',
    },
  });

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      const base64 = await toBase64(file);
      form.setValue('textbookPageImage', base64);
    }
  }

  async function onSubmit(values: z.infer<typeof worksheetsSchema>) {
    setIsLoading(true);
    setWorksheets([]);
    try {
      const result = await generateDifferentiatedWorksheets(values);
      setWorksheets(result.worksheets);
    } catch (error) {
      console.error('Error generating worksheets:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate worksheets. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

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
            <h1 className="font-headline text-xl font-bold text-primary">Worksheets</h1>
            <SidebarTrigger />
        </header>
    <div className="flex-1 p-4 md:p-8 overflow-auto">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Differentiated Worksheets Generator</CardTitle>
          <CardDescription>Upload a textbook page to create worksheets for different grade levels.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="textbookPageImage"
                render={() => (
                  <FormItem>
                    <FormLabel>Textbook Page Image</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" onChange={handleFileChange} />
                    </FormControl>
                    <FormMessage />
                    {preview && <Image src={preview} alt="Textbook page preview" width={200} height={200} className="mt-4 rounded-md object-contain" />}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gradeLevels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Levels</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 3, 4, 5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
                Generate Worksheets
              </Button>
            </form>
          </Form>
        </CardContent>
        {worksheets.length > 0 && (
          <CardFooter>
             <Card className="w-full bg-secondary/50">
                <CardHeader>
                  <CardTitle className="font-headline text-xl">Generated Worksheets</CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {worksheets.map((ws, index) => (
                        <AccordionItem value={`item-${index}`} key={index}>
                          <AccordionTrigger>Grade Level: {ws.gradeLevel}</AccordionTrigger>
                          <AccordionContent>
                            <pre className="whitespace-pre-wrap font-body text-sm">{ws.worksheetContent}</pre>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                </CardContent>
              </Card>
          </CardFooter>
        )}
      </Card>
    </div>
    </div>
  );
}
