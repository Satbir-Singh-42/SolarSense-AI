import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  CloudSun,
  Menu,
  LogOut,
  User,
  Home,
  TrendingUp,
  HelpCircle,
  Database,
  Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface NavbarProps {
  currentPage?: "dashboard" | "about" | "chat" | "storage" | "login" | "signup";
  activeTab?: "energy-dashboard" | "energy-trading" | "simulation";
  onTabChange?: (
    tab: "energy-dashboard" | "energy-trading" | "simulation"
  ) => void;
}

export default function Navbar({
  currentPage,
  activeTab,
  onTabChange,
}: NavbarProps) {
  const { user, logoutMutation } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-md border-b border-slate-700/50 shadow-xl shadow-slate-900/20 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105">
              <div className="p-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full">
                <CloudSun className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                SolarSense
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {currentPage === "dashboard" ? (
              <>
                <button
                  onClick={() => onTabChange?.("energy-dashboard")}
                  className={`transition-all duration-300 ease-in-out transform hover:scale-105 ${
                    activeTab === "energy-dashboard"
                      ? "text-primary font-medium"
                      : "text-secondary-custom hover:text-primary"
                  }`}>
                  Energy Dashboard
                </button>
                <button
                  onClick={() => onTabChange?.("energy-trading")}
                  className={`transition-all duration-300 ease-in-out transform hover:scale-105 ${
                    activeTab === "energy-trading"
                      ? "text-primary font-medium"
                      : "text-secondary-custom hover:text-primary"
                  }`}>
                  Energy Trading
                </button>
                <button
                  onClick={() => onTabChange?.("simulation")}
                  className={`transition-all duration-300 ease-in-out transform hover:scale-105 ${
                    activeTab === "simulation"
                      ? "text-primary font-medium"
                      : "text-secondary-custom hover:text-primary"
                  }`}>
                  Simulation
                </button>
              </>
            ) : (
              <>
                <Link href="/?tab=energy-dashboard">
                  <button className="text-secondary-custom hover:text-primary transition-all duration-300 ease-in-out transform hover:scale-105">
                    Energy Dashboard
                  </button>
                </Link>
                <Link href="/?tab=energy-trading">
                  <button className="text-secondary-custom hover:text-primary transition-all duration-300 ease-in-out transform hover:scale-105">
                    Energy Trading
                  </button>
                </Link>
                <Link href="/?tab=simulation">
                  <button className="text-secondary-custom hover:text-primary transition-all duration-300 ease-in-out transform hover:scale-105">
                    Simulation
                  </button>
                </Link>
              </>
            )}

            {user && (
              <Link href="/storage">
                <button
                  className={`transition-all duration-300 ease-in-out transform hover:scale-105 ${
                    currentPage === "storage"
                      ? "text-primary font-medium"
                      : "text-secondary-custom hover:text-primary"
                  }`}>
                  Storage
                </button>
              </Link>
            )}


            <Link href="/about">
              <button
                className={`transition-all duration-300 ease-in-out transform hover:scale-105 ${
                  currentPage === "about"
                    ? "text-primary font-medium"
                    : "text-secondary-custom hover:text-primary"
                }`}>
                About
              </button>
            </Link>

            {user ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                className="flex items-center gap-2 bg-card hover:bg-destructive/10 text-red-500 border-red-500/20 hover:border-red-500/30 transition-all duration-300 ease-in-out transform active:scale-95">
                <LogOut size={16} />
                Logout
              </Button>
            ) : (
              <Link href="/login">
                <button className="bg-primary text-white px-4 py-2 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105">
                  Login
                </button>
              </Link>
            )}
          </nav>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-slate-800/50 hover:bg-blue-600/20 text-gray-300 hover:text-blue-400 border-slate-600/50 hover:border-blue-400/60 active:scale-95 transition-all duration-300 ease-in-out backdrop-blur-sm shadow-lg">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[280px] sm:w-[300px] lg:w-[350px] p-0 overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-l border-slate-700/50 shadow-2xl backdrop-blur-xl">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Main navigation menu for SolarSense
                </SheetDescription>
                <nav className="flex flex-col space-y-3 sm:space-y-4 lg:space-y-6 p-3 sm:p-4 lg:p-6 mt-3 sm:mt-4 lg:mt-8">
                  <div className="flex flex-col space-y-3 sm:space-y-4">
                    <h3 className="font-semibold text-base sm:text-lg bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent px-1">
                      Energy Platform
                    </h3>
                    {currentPage === "dashboard" && onTabChange ? (
                      <>
                        <button
                          onClick={() => {
                            onTabChange("energy-dashboard");
                            window.history.pushState(
                              {},
                              "",
                              "/?tab=energy-dashboard"
                            );
                            setIsMenuOpen(false);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 text-xs sm:text-sm md:text-base touch-manipulation ${
                            activeTab === "energy-dashboard"
                              ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                              : "text-gray-300 hover:bg-slate-800/60 hover:text-blue-400 backdrop-blur-sm border border-transparent hover:border-blue-500/30"
                          }`}>
                          <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Energy Dashboard</span>
                        </button>
                        <button
                          onClick={() => {
                            onTabChange("energy-trading");
                            window.history.pushState(
                              {},
                              "",
                              "/?tab=energy-trading"
                            );
                            setIsMenuOpen(false);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 text-xs sm:text-sm md:text-base touch-manipulation ${
                            activeTab === "energy-trading"
                              ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                              : "text-gray-300 hover:bg-slate-800/60 hover:text-blue-400 backdrop-blur-sm border border-transparent hover:border-blue-500/30"
                          }`}>
                          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Energy Trading</span>
                        </button>
                        <button
                          onClick={() => {
                            onTabChange("simulation");
                            window.history.pushState(
                              {},
                              "",
                              "/?tab=simulation"
                            );
                            setIsMenuOpen(false);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 text-xs sm:text-sm md:text-base touch-manipulation ${
                            activeTab === "simulation"
                              ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                              : "text-gray-300 hover:bg-slate-800/60 hover:text-blue-400 backdrop-blur-sm border border-transparent hover:border-blue-500/30"
                          }`}>
                          <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Simulation Lab</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href="/?tab=energy-dashboard">
                          <Button
                            variant="outline"
                            className="w-full justify-start space-x-2 sm:space-x-3 text-xs sm:text-sm md:text-base py-2 sm:py-2.5 transition-all duration-300 ease-in-out transform hover:scale-105 touch-manipulation bg-slate-800/40 hover:bg-slate-700/60 text-gray-300 hover:text-blue-400 border-slate-600/50 hover:border-blue-500/50 backdrop-blur-sm"
                            onClick={() => setIsMenuOpen(false)}>
                            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Energy Dashboard</span>
                          </Button>
                        </Link>
                        <Link href="/?tab=energy-trading">
                          <Button
                            variant="outline"
                            className="w-full justify-start space-x-2 sm:space-x-3 text-xs sm:text-sm md:text-base py-2 sm:py-2.5 transition-all duration-300 ease-in-out transform hover:scale-105 touch-manipulation bg-slate-800/40 hover:bg-slate-700/60 text-gray-300 hover:text-blue-400 border-slate-600/50 hover:border-blue-500/50 backdrop-blur-sm"
                            onClick={() => setIsMenuOpen(false)}>
                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Energy Trading</span>
                          </Button>
                        </Link>
                        <Link href="/?tab=simulation">
                          <Button
                            variant="outline"
                            className="w-full justify-start space-x-2 sm:space-x-3 text-xs sm:text-sm md:text-base py-2 sm:py-2.5 transition-all duration-300 ease-in-out transform hover:scale-105 touch-manipulation bg-slate-800/40 hover:bg-slate-700/60 text-gray-300 hover:text-blue-400 border-slate-600/50 hover:border-blue-500/50 backdrop-blur-sm"
                            onClick={() => setIsMenuOpen(false)}>
                            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Simulation Lab</span>
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>

                  {user && (
                    <div className="flex flex-col space-y-3 sm:space-y-4">
                      <h3 className="font-semibold text-base sm:text-lg bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent px-1">
                        Data Management
                      </h3>
                      <Link href="/storage">
                        <Button
                          variant={
                            currentPage === "storage" ? "default" : "outline"
                          }
                          className={`w-full justify-start space-x-2 sm:space-x-3 text-xs sm:text-sm md:text-base py-2 sm:py-2.5 transition-all duration-300 ease-in-out transform hover:scale-105 touch-manipulation ${
                            currentPage === "storage"
                              ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
                              : "bg-slate-800/40 hover:bg-slate-700/60 text-gray-300 hover:text-green-400 border-slate-600/50 hover:border-green-500/50 backdrop-blur-sm"
                          }`}
                          onClick={() => setIsMenuOpen(false)}>
                          <Database className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Storage</span>
                        </Button>
                      </Link>
                    </div>
                  )}


                  <div className="flex flex-col space-y-3 sm:space-y-4">
                    <h3 className="font-semibold text-base sm:text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent px-1">
                      Information
                    </h3>
                    <Link href="/about">
                      <Button
                        variant={
                          currentPage === "about" ? "default" : "outline"
                        }
                        className={`w-full justify-start space-x-2 sm:space-x-3 text-xs sm:text-sm md:text-base py-2 sm:py-2.5 transition-all duration-300 ease-in-out transform hover:scale-105 touch-manipulation ${
                          currentPage === "about"
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                            : "bg-slate-800/40 hover:bg-slate-700/60 text-gray-300 hover:text-purple-400 border-slate-600/50 hover:border-purple-500/50 backdrop-blur-sm"
                        }`}
                        onClick={() => setIsMenuOpen(false)}>
                        <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>About</span>
                      </Button>
                    </Link>
                  </div>

                  {/* Authentication Section */}
                  <div className="flex flex-col space-y-3 sm:space-y-4">
                    <h3 className="font-semibold text-base sm:text-lg bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent px-1">
                      Account
                    </h3>
                    {user ? (
                      <Button
                        variant="outline"
                        className="w-full justify-start space-x-2 sm:space-x-3 text-xs sm:text-sm md:text-base py-2 sm:py-2.5 bg-slate-800/40 hover:bg-red-900/30 text-red-400 border-red-500/30 hover:border-red-400/60 transition-all duration-300 ease-in-out transform active:scale-95 touch-manipulation backdrop-blur-sm hover:shadow-lg"
                        onClick={() => {
                          logoutMutation.mutate();
                          setIsMenuOpen(false);
                        }}>
                        <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Logout</span>
                      </Button>
                    ) : (
                      <Link href="/login">
                        <Button
                          className="w-full justify-start space-x-2 sm:space-x-3 text-xs sm:text-sm md:text-base py-2 sm:py-2.5 transition-all duration-300 ease-in-out transform hover:scale-105 touch-manipulation bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg"
                          onClick={() => setIsMenuOpen(false)}>
                          <User className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Login</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
