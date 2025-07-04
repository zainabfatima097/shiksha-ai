"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateVisualAid } from '@/ai/flows/generate-visual-aids';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Image from 'next/image';

const visualAidSchema = z.object({
  description: z.string().min(10, 'Please provide a more detailed description.'),
});

export default function VisualAidsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [visualAid, setVisualAid] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof visualAidSchema>>({
    resolver: zodResolver(visualAidSchema),
    defaultValues: {
      description: '',
    },
  });

  async function onSubmit(values: z.infer<typeof visualAidSchema>) {
    setIsLoading(true);
    setVisualAid(null);
    try {
      const result = await generateVisualAid(values);
      setVisualAid(result.visualAidDataUri);
    } catch (error) {
      console.error('Error generating visual aid:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate visual aid. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-4 border-b md:hidden">
        <h1 className="font-headline text-xl font-bold text-primary">Visual Aids</h1>
        <SidebarTrigger />
      </header>
      <div className="flex-1 p-4 md:p-8 overflow-auto">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Visual Aid Generator</CardTitle>
          <CardDescription>Describe a simple line drawing or chart to explain a concept.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., A simple diagram of the water cycle showing evaporation, condensation, and precipitation." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
                Generate Visual Aid
              </Button>
            </form>
          </Form>
        </CardContent>
        {isLoading && (
            <CardFooter>
              <Skeleton className="w-full h-80 rounded-lg" />
            </CardFooter>
        )}
        {visualAid && (
          <CardFooter>
            <div className='w-full p-4 border rounded-lg bg-secondary/50'>
              <Image src={visualAid} alt="Generated visual aid" width={512} height={512} className="rounded-md mx-auto" />
            </div>
          </CardFooter>
        )}
      </Card>
      </div>
    </div>
  );
}
