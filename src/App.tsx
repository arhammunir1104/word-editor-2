import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { ThemeProvider } from "./components/theme-provider";
import NotFound from "./pages/not-found";
import Home from "./pages/home";
import Editor from "./pages/editor";

function Router() {
  return ( 
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/document/:id" component={Editor} />
      <Route path="/document" component={Editor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <Router />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
