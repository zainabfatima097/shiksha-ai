
import React from 'react';

// This is a minimal layout to override the main app layout,
// ensuring the admin page is standalone and doesn't require authentication.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
