import { Switch, Route, Router as WouterRouter } from "wouter";
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
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/supplies" component={Supplies} />
      <Route path="/supplies/:id" component={SupplyDetail} />
      <Route path="/usage" component={UsageLogs} />
      <Route path="/low-stock" component={LowStock} />
      <Route path="/stock" component={Stock} />
      <Route path="/out-of-stock" component={OutOfStock} />
      <Route path="/classrooms" component={Classrooms} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
