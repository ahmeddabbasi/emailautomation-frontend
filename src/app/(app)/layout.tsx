import { Sidebar } from "@/components/layout/sidebar";
import { ClientErrorReporter } from "@/components/layout/client-error-reporter";
import { ProviderNotice } from "@/components/layout/provider-notice";
import { GuideBar } from "@/components/guide/navigator";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <ClientErrorReporter />
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <ProviderNotice />
        <GuideBar />
        {children}
      </main>
    </div>
  );
}
