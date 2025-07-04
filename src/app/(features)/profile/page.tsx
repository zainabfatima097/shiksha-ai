
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';

interface UserProfile {
    uid: string;
    name: string;
    email: string;
    role: 'teacher' | 'student';
    class?: string;
    section?: string;
    rollNumber?: string;
}

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                // Try fetching from 'teachers' collection first
                let docRef = doc(db, 'teachers', user.uid);
                let docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProfile(docSnap.data() as UserProfile);
                } else {
                    // If not found, try 'students' collection
                    docRef = doc(db, 'students', user.uid);
                    docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        setProfile(docSnap.data() as UserProfile);
                    } else {
                        setError('We couldn’t find a profile for your account.');
                    }
                }
            } catch (e) {
                console.error("Error fetching user profile:", e);
                setError('An error occurred while fetching your profile. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user, authLoading]);

    if (authLoading || loading) {
        return (
            <div className="flex flex-col h-full">
                <header className="flex items-center justify-between p-4 border-b md:hidden">
                    <h1 className="font-headline text-xl font-bold text-primary">Profile</h1>
                    <SidebarTrigger />
                </header>
                <div className="flex flex-1 items-center justify-center">
                    <LoadingSpinner className="h-12 w-12" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between p-4 border-b md:hidden">
                <h1 className="font-headline text-xl font-bold text-primary">Profile</h1>
                <SidebarTrigger />
            </header>
            <div className="flex-1 p-4 md:p-8 overflow-auto">
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">User Profile</CardTitle>
                        <CardDescription>View your account details below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                             <Alert variant="destructive">
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {!profile && !error && (
                            <p>No profile information available.</p>
                        )}
                        {profile && (
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-muted-foreground">Name</span>
                                    <span className="font-medium">{profile.name}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-muted-foreground">Email</span>
                                    <span className="font-medium">{profile.email}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-muted-foreground">Role</span>
                                    <span className="font-medium capitalize">{profile.role}</span>
                                </div>
                                {profile.role === 'student' && (
                                    <>
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-muted-foreground">Class</span>
                                            <span className="font-medium">{profile.class}</span>
                                        </div>
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-muted-foreground">Section</span>
                                            <span className="font-medium">{profile.section}</span>
                                        </div>
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-muted-foreground">Roll Number</span>
                                            <span className="font-medium">{profile.rollNumber}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

