import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { TenantProvider } from "@/contexts/tenant-context";
import { NotificationProvider } from "@/components/ui/NotificationSystem";
import { GlobalErrorBoundary } from "@/components/common/GlobalErrorBoundary";
import { WebpackModuleInitializer } from "@/components/common/WebpackModuleInitializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agendalo - Plataforma de Agendamiento Médico AI-First",
  description: "Agenda citas médicas mediante lenguaje natural con nuestra plataforma inteligente",
  keywords: "agendamiento médico, citas médicas, inteligencia artificial, chatbot médico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <WebpackModuleInitializer />
        <GlobalErrorBoundary>
          <NotificationProvider>
            <AuthProvider>
              <TenantProvider>
                {children}
              </TenantProvider>
            </AuthProvider>
          </NotificationProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
