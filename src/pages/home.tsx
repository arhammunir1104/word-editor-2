import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../components/ui/skeleton";
import { PlusCircle, File, Clock, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: documents, isLoading } : any = useQuery({
    queryKey: ["/api/documents"],
  });

  const filteredDocuments : any = documents?.filter(doc  => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) ;

  return (
    <div className="min-h-screen bg-doc-bg">
      <header className="bg-white border-b border-border-color py-4 px-6 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <img src="https://www.gstatic.com/images/branding/product/1x/docs_2020q4_48dp.png" alt="Google Docs Logo" className="w-10 h-10" />
            <h1 className="text-xl font-semibold text-text-primary">Docs</h1>
          </div>
          <div className="w-1/2">
            <Input 
              type="text" 
              placeholder="Search documents" 
              className="w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-10 h-10 rounded-full bg-google-blue text-white flex items-center justify-center">
            U
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-6">
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-text-primary">Start a new document</h2>
          </div>
          <Link href="/document">
            <Button variant="outline" className="h-60 w-44 flex flex-col items-center justify-center hover:border-google-blue rounded-md">
              <PlusCircle size={40} className="mb-2 text-google-blue" />
              <span className="text-text-primary">Blank</span>
            </Button>
          </Link>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-text-primary text-red-200">Recent documents</h2>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-0">
                    <Skeleton className="h-36 w-full" />
                    <div className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDocuments?.length === 0 ? (
            <div className="text-center py-10">
              <File size={48} className="mx-auto mb-4 text-text-secondary" />
              <h3 className="text-lg font-medium text-text-primary mb-2">No documents found</h3>
              <p className="text-text-secondary">
                {searchQuery ? `No results for "${searchQuery}"` : "Create a new document to get started"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredDocuments?.map((doc) => (
                <Link key={doc.id} href={`/document/${doc.id}`}>
                  <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                    <div className="h-36 bg-white border-b"></div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-text-primary mb-1 truncate">{doc.title}</h3>
                      <div className="flex items-center text-sm text-text-secondary">
                        <Clock size={14} className="mr-1" />
                        <span>Edited {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
