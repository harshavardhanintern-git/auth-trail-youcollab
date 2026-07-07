import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export default function SidebarLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto min-h-0 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export { SidebarLayout };
