import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "@shared/schema";
import { z } from "zod";
import {
  CloudSun,
  Mail,
  Lock,
  User,
  UserPlus,
  Eye,
  EyeOff,
  Phone,
  Battery,
  Zap,
  MapPin,
  Building,
  Home,
  Loader2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import ValidationCard from "@/components/validation-card";

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { user, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [showValidationCard, setShowValidationCard] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [validationType, setValidationType] = useState<"error" | "success">(
    "error",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);

  // Check if password meets requirements
  const isPasswordValid = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasMinLength = password.length >= 8;
    return hasUpperCase && hasLowerCase && hasNumber && hasMinLength;
  };

  // Handle password input change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPasswordValue(value);

    // Show help text only if password is not empty and doesn't meet requirements
    if (value.length > 0 && !isPasswordValid(value)) {
      setShowPasswordHelp(true);
    } else {
      setShowPasswordHelp(false);
    }
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  // Handle registration errors including server issues
  useEffect(() => {
    if (registerMutation.isError) {
      const errorMessage = registerMutation.error?.message || "";

      // Handle server errors
      if (
        errorMessage.includes("Server is currently unavailable") ||
        errorMessage.includes("Failed to fetch")
      ) {
        setValidationMessage("Server is down. Please try again later.");
        setValidationType("error");
        setShowValidationCard(true);
        setTimeout(() => {
          setShowValidationCard(false);
        }, 5000);
      } else {
        // Handle registration errors
        if (errorMessage.includes("Email already registered")) {
          setValidationMessage(
            "This email is already registered. Please use a different email or try logging in instead.",
          );
        } else if (errorMessage.includes("Username already taken")) {
          setValidationMessage(
            "This username is already taken. Please choose a different username.",
          );
        } else {
          setValidationMessage(
            "Registration failed. Please check your information and try again.",
          );
        }
        setValidationType("error");
        setShowValidationCard(true);
        setTimeout(() => {
          setShowValidationCard(false);
        }, 5000);
      }
    }
  }, [registerMutation.isError, registerMutation.error]);

  // Handle successful registration - show success card then redirect to dashboard
  useEffect(() => {
    if (registerMutation.isSuccess) {
      setValidationMessage(
        "Account created successfully! Welcome to SolarSense AI.",
      );
      setValidationType("success");
      setShowValidationCard(true);
      setTimeout(() => {
        setShowValidationCard(false);
        setLocation("/");
      }, 2500);
    }
  }, [registerMutation.isSuccess, setLocation]);

  // If user is already authenticated, redirect to dashboard (but not during registration process)
  useEffect(() => {
    if (
      user &&
      !registerMutation.isPending &&
      !registerMutation.isError &&
      !registerMutation.isSuccess
    ) {
      setLocation("/");
    }
  }, [
    user,
    setLocation,
    registerMutation.isPending,
    registerMutation.isError,
    registerMutation.isSuccess,
  ]);

  const onSubmit = (data: SignupForm) => {
    registerMutation.mutate(data);
  };

  return (
    <>
      {/* Validation Card - Positioned lower below navbar */}
      {showValidationCard && (
        <div className="fixed top-20 sm:top-24 md:top-28 right-2 sm:right-4 md:right-6 z-[10000] w-full max-w-xs sm:max-w-sm md:max-w-md px-2 sm:px-0">
          <ValidationCard
            type={validationType}
            title={
              validationType === "success"
                ? "Account Created"
                : "Registration Failed"
            }
            description={validationMessage}
            onClose={() => setShowValidationCard(false)}
          />
        </div>
      )}

      <div
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-6"
        style={{ paddingTop: "3.75rem" }}>
        <div className="w-full max-w-6xl grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 items-start">
          {/* Left side - Benefits Section */}
          <div className="hidden md:flex flex-col justify-start space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 order-1 md:order-1">
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Join the Energy Revolution
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-secondary-custom leading-relaxed">
                Connect with neighbors, trade solar energy, and help build a
                sustainable future with AI-powered grid optimization.
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-1.5 sm:p-2 bg-secondary/20 rounded-full mt-1">
                  <CloudSun className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-primary-custom">
                    Real Energy Trading
                  </h3>
                  <p className="text-xs sm:text-sm text-secondary-custom">
                    Trade surplus solar energy directly with verified households
                    in your area
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-1.5 sm:p-2 bg-primary/20 rounded-full mt-1">
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-primary-custom">
                    Grid Simulation & Testing
                  </h3>
                  <p className="text-xs sm:text-sm text-secondary-custom">
                    Test energy scenarios with AI-powered simulations before
                    implementing
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-1.5 sm:p-2 bg-accent/20 rounded-full mt-1">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-primary-custom">
                    AI Energy Optimization
                  </h3>
                  <p className="text-xs sm:text-sm text-secondary-custom">
                    Get personalized recommendations to maximize your solar
                    investment
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-1.5 sm:p-2 bg-primary/20 rounded-full mt-1">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-primary-custom">
                    Secure & Transparent
                  </h3>
                  <p className="text-xs sm:text-sm text-secondary-custom">
                    All transactions are secure with transparent pricing and
                    verified participants
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Signup Form */}
          <div className="flex justify-center md:justify-start order-2 md:order-2 p-4">
            <Card className="w-full max-w-sm sm:max-w-md bg-muted backdrop-blur-sm border border-border shadow-2xl">
              <CardHeader className="space-y-1 text-center px-4 sm:px-6 py-4 sm:py-6">
                <div className="flex items-center justify-center space-x-2 mb-3 sm:mb-4">
                  <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full">
                    <CloudSun className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
                <CardTitle className="text-xl sm:text-2xl font-semibold text-primary-custom">
                  Create Account
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-secondary-custom">
                  Join thousands of solar professionals
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="username"
                      className="text-sm font-medium text-primary-custom">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="Choose a username"
                        className="pl-10 h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-blue-800 to-blue-700 border-blue-600 text-white placeholder:text-blue-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                        {...register("username")}
                      />
                    </div>
                    {errors.username && (
                      <p className="text-sm text-red-600">
                        {errors.username.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-primary-custom">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-blue-800 to-blue-700 border-blue-600 text-white placeholder:text-blue-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                        {...register("email")}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-600">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-primary-custom">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        className="pl-10 pr-10 h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-blue-800 to-blue-700 border-blue-600 text-white placeholder:text-blue-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                        {...register("password", {
                          onChange: handlePasswordChange,
                        })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-blue-200 hover:text-white transition-colors duration-200">
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-600">
                        {errors.password.message}
                      </p>
                    )}
                    {showPasswordHelp && (
                      <p className="text-xs text-red-500">
                        Password must be at least 8 characters with uppercase,
                        lowercase, and number
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-primary-custom">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="pl-10 pr-10 h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-blue-800 to-blue-700 border-blue-600 text-white placeholder:text-blue-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                        {...register("confirmPassword")}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-3 text-blue-200 hover:text-white transition-colors duration-200">
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-600">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  {/* Trading Profile Section */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-3">
                      <Label
                        htmlFor="phone"
                        className="text-sm font-medium text-primary-custom">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+91-98765-43210"
                          className="pl-10 h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-blue-800 to-blue-700 border-blue-600 text-white placeholder:text-blue-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                          {...register("phone")}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-sm text-red-600">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-3">
                        <Label
                          htmlFor="state"
                          className="text-sm font-medium text-primary-custom">
                          State <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                          <Input
                            id="state"
                            type="text"
                            placeholder="Enter your state"
                            className="pl-10 h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-blue-800 to-blue-700 border-blue-600 text-white placeholder:text-blue-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                            {...register("state")}
                          />
                        </div>
                        {errors.state && (
                          <p className="text-sm text-red-600">
                            {errors.state.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label
                          htmlFor="district"
                          className="text-sm font-medium text-primary-custom">
                          District <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                          <Input
                            id="district"
                            type="text"
                            placeholder="Enter your district"
                            className="pl-10 h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-blue-800 to-blue-700 border-blue-600 text-white placeholder:text-blue-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                            {...register("district")}
                          />
                        </div>
                        {errors.district && (
                          <p className="text-sm text-red-600">
                            {errors.district.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="address"
                        className="text-sm font-medium text-primary-custom">
                        Physical Address <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                        <Input
                          id="address"
                          type="text"
                          placeholder="123 Solar Nagar, City, State"
                          className="pl-10 h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-blue-800 to-blue-700 border-blue-600 text-white placeholder:text-blue-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                          {...register("address")}
                        />
                      </div>
                      {errors.address && (
                        <p className="text-sm text-red-600">
                          {errors.address.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="householdName"
                        className="text-sm font-medium text-primary-custom">
                        Household Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Home className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                        <Input
                          id="householdName"
                          type="text"
                          placeholder="Smith Family Solar Home"
                          className="pl-10 h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-blue-800 to-blue-700 border-blue-600 text-white placeholder:text-blue-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                          {...register("householdName")}
                        />
                      </div>
                      {errors.householdName && (
                        <p className="text-sm text-red-600">
                          {errors.householdName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="solarCapacity"
                        className="text-sm font-medium text-primary-custom">
                        Solar Capacity (Watts){" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Zap className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                        <Input
                          id="solarCapacity"
                          type="number"
                          placeholder="8000"
                          className="pl-10 h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-blue-800 to-blue-700 border-blue-600 text-white placeholder:text-blue-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                          {...register("solarCapacity")}
                        />
                      </div>
                      {errors.solarCapacity && (
                        <p className="text-sm text-red-600">
                          {errors.solarCapacity.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label
                        htmlFor="batteryCapacity"
                        className="text-sm font-medium text-primary-custom">
                        Battery Storage (kWh){" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Battery className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
                        <Input
                          id="batteryCapacity"
                          type="number"
                          step="1"
                          placeholder="13"
                          className="pl-10 h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-blue-800 to-blue-700 border-blue-600 text-white placeholder:text-blue-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                          {...register("batteryCapacity")}
                        />
                      </div>
                      {errors.batteryCapacity && (
                        <p className="text-sm text-red-600">
                          {errors.batteryCapacity.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-start space-x-2 pt-2">
                      <Controller
                        name="dataAccuracyConfirmed"
                        control={control}
                        render={({ field }) => (
                          <Checkbox
                            id="dataAccuracyConfirmed"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-1"
                          />
                        )}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor="dataAccuracyConfirmed"
                          className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-primary-custom">
                          I confirm that the provided energy system details are
                          accurate
                        </Label>
                      </div>
                    </div>
                    {errors.dataAccuracyConfirmed && (
                      <p className="text-sm text-red-600">
                        {errors.dataAccuracyConfirmed.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="w-full h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation">
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  <div className="text-center pt-2">
                    <p className="text-xs sm:text-sm text-secondary-custom">
                      Already have an account?{" "}
                      <Link href="/login">
                        <span className="text-primary hover:text-accent font-medium cursor-pointer transition-colors duration-200">
                          Sign in here
                        </span>
                      </Link>
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
