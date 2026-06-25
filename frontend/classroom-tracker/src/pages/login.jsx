import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Lock, User as UserIcon, School, Key, Mail } from "lucide-react";
import { useListPublicClassrooms } from "@workspace/api-client-react";
export default function Login() {
    const { login, register } = useAuth();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("login");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [classroomId, setClassroomId] = useState("");
    const [role, setRole] = useState("teacher");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { data: publicClassrooms = [] } = useListPublicClassrooms();
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            toast({
                title: "Validation Error",
                description: "Please enter both username and password.",
                variant: "destructive",
            });
            return;
        }
        setIsSubmitting(true);
        try {
            if (activeTab === "login") {
                await login({ username, password });
                toast({
                    title: "Welcome back!",
                    description: `Logged in as ${username}.`,
                });
                setLocation("/");
            }
            else {
                if (!name) {
                    toast({
                        title: "Validation Error",
                        description: "Please enter your full name.",
                        variant: "destructive",
                    });
                    setIsSubmitting(false);
                    return;
                }
                if (!classroomId) {
                    toast({
                        title: "Validation Error",
                        description: "Please select your classroom.",
                        variant: "destructive",
                    });
                    setIsSubmitting(false);
                    return;
                }
                await register({ username, password, name, role: "teacher", classroomId: Number(classroomId) });
                toast({
                    title: "Registration request submitted!",
                    description: "Your teacher account has been created. An administrator must approve your registration request before you can log in.",
                });
                setActiveTab("login");
                setPassword("");
            }
        }
        catch (err) {
            const isPendingApproval = err?.status === 403;
            toast({
                title: isPendingApproval ? "Account Pending Approval" : "Authentication Failed",
                description: isPendingApproval
                    ? "Your teacher account registration is pending admin approval."
                    : (err?.message || "An error occurred during authentication."),
                variant: isPendingApproval ? "default" : "destructive",
            });
        }
        finally {
            setIsSubmitting(false);
        }
    };

    return (<div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950 via-slate-900 to-black">
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"/>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"/>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="w-full max-w-md z-10">
        {/* App Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 text-primary shadow-xl shadow-primary/10 mb-4 animate-pulse">
            <School className="w-9 h-9"/>
          </div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">
            Classroom Tracker
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Manage and monitor school supplies effortlessly</p>
        </div>

        {/* Auth Glass Card */}
        <Card className="border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"/>
          
          <Tabs value={activeTab} onValueChange={(val) => {
            setActiveTab(val);
            setUsername("");
            setPassword("");
            setName("");
            setClassroomId("");
        }} className="w-full">
            <TabsList className="grid grid-cols-2 bg-slate-950/40 border-b border-slate-800 rounded-none h-12 p-0">
              <TabsTrigger value="login" className="text-slate-400 data-[state=active]:text-white data-[state=active]:bg-slate-900/50 rounded-none h-full">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="text-slate-400 data-[state=active]:text-white data-[state=active]:bg-slate-900/50 rounded-none h-full">
                Register Request
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-center text-white">Sign In</CardTitle>
                <CardDescription className="text-center text-slate-400">
                  Access the Classroom Supply Management System
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-2">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-slate-300 font-medium">Username</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                      <Input id="username" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10 bg-slate-950/40 border-slate-800 focus:border-primary/60 text-white focus:ring-1 focus:ring-primary/60 transition-all placeholder:text-slate-600" required/>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-slate-300 font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                      <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 bg-slate-950/40 border-slate-800 focus:border-primary/60 text-white focus:ring-1 focus:ring-primary/60 transition-all placeholder:text-slate-600" required/>
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/95 text-white font-semibold shadow-lg shadow-primary/25 border-none transition-all py-5 mt-6 cursor-pointer">
                    {isSubmitting ? (<span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                        Authenticating...
                      </span>) : ("Sign In to Dashboard")}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="register" className="mt-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-center text-white">Teacher Registration</CardTitle>
                <CardDescription className="text-center text-slate-400">
                  Submit teacher registration for admin approval
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-2">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-name" className="text-slate-300 font-medium">Full Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                      <Input id="reg-name" placeholder="e.g. Ms. Johnson" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 bg-slate-950/40 border-slate-800 focus:border-primary/60 text-white focus:ring-1 focus:ring-primary/60 transition-all placeholder:text-slate-600" required/>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email" className="text-slate-300 font-medium">Email / Username</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                      <Input id="reg-email" type="email" placeholder="e.g. msjohnson@school.edu" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10 bg-slate-950/40 border-slate-800 focus:border-primary/60 text-white focus:ring-1 focus:ring-primary/60 transition-all placeholder:text-slate-600" required/>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-classroom" className="text-slate-300 font-medium">Select Classroom</Label>
                    <div className="relative">
                      <School className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                      <select id="reg-classroom" value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className="w-full pl-10 pr-10 py-2 bg-slate-950/40 border border-slate-800 rounded-md focus:border-primary/60 text-white focus:ring-1 focus:ring-primary/60 transition-all cursor-pointer h-10 select-none appearance-none" style={{ colorScheme: 'dark' }} required>
                        <option value="" className="bg-slate-900 text-slate-500">Select a classroom</option>
                        {publicClassrooms.map((c) => (<option key={c.id} value={c.id} className="bg-slate-900 text-white">
                            {c.name} (Grade {c.grade})
                          </option>))}
                      </select>
                      <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400 text-xs">▼</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="text-slate-300 font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                      <Input id="reg-password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 bg-slate-950/40 border-slate-800 focus:border-primary/60 text-white focus:ring-1 focus:ring-primary/60 transition-all placeholder:text-slate-600" required/>
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/95 text-white font-semibold shadow-lg shadow-primary/25 border-none transition-all py-5 mt-6 cursor-pointer">
                    {isSubmitting ? (<span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                        Submitting request...
                      </span>) : ("Submit Registration Request")}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>



        </Card>
      </motion.div>
    </div>);
}
