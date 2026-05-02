import { Outlet } from "react-router-dom";
import StatusBar from "../components/StatusBar";
import Sidebar from "../components/Sidebar";

export default function MainLayout({ state, connected }) {
  return (
    <div className="min-h-screen bg-gray-950">
      <StatusBar state={state} connected={connected} />
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-56px)]">
        <Sidebar />
        <main className="flex-1 px-4 md:px-6 py-6">
          <div className="max-w-[1500px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
