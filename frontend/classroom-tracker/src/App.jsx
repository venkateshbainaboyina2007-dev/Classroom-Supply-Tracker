import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Supplies from "@/pages/supplies";
import SupplyDetail from "@/pages/supply-detail";
import UsageLogs from "@/pages/usage";
import LowStock from "@/pages/low-stock";
import Stock from "@/pages/stock";
import OutOfStock from "@/pages/out-of-stock";
import Classrooms from "@/pages/classrooms";
import ClassroomDetail from "@/pages/classroom-detail";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Requests from "@/pages/requests";
import Reports from "@/pages/reports";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import Teachers from "@/pages/teachers";
const queryClient = new QueryClient();
function Router() {
    const { user, isLoading } = useAuth();
    if (isLoading) {
        return (<div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary"/>
      </div>);
    }
    if (!user) {
        return <Login />;
    }
    return (<Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/supplies" component={Supplies}/>
      <Route path="/supplies/:id" component={SupplyDetail}/>
      <Route path="/usage" component={UsageLogs}/>
      <Route path="/low-stock" component={LowStock}/>
      <Route path="/stock" component={Stock}/>
      <Route path="/out-of-stock" component={OutOfStock}/>
      <Route path="/requests" component={Requests}/>
      
      {/* Route guards for classrooms list */}
      {user.role === "admin" ? (<Route path="/classrooms" component={Classrooms}/>) : (<Route path="/classrooms">
          <Redirect to={`/classrooms/${user.classroomId || 0}`}/>
        </Route>)}

      {/* Guarded classroom details */}
      <Route path="/classrooms/:id">
        {(params) => {
            const id = Number(params.id);
            if (user.role === "teacher" && user.classroomId !== id) {
                return <Redirect to={`/classrooms/${user.classroomId || 0}`}/>;
            }
            return <ClassroomDetail params={params}/>;
        }}
      </Route>

      {/* Admin-only paths */}
      {user.role === "admin" ? (<Route path="/teachers" component={Teachers}/>) : (<Route path="/teachers">
          <Redirect to="/"/>
        </Route>)}
      
      {user.role === "admin" ? (<Route path="/reports" component={Reports}/>) : (<Route path="/reports">
          <Redirect to="/"/>
        </Route>)}

      <Route component={NotFound}/>
    </Switch>);
}
function App() {
    return (<QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>);
}
export default App;
