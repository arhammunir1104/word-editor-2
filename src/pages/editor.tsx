import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import EditorComponent from "../components/editor";
import Header from "../components/editor/header";
import CommentsSidebar from "../components/editor/comments-sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { useEditorStore } from "../lib/editor-store";
import { Document } from "../shared/schema";

export default function Editor() {
  const [location, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const setDocumentId = useEditorStore((state) => state.setDocumentId);
  const setTitle = useEditorStore((state) => state.setTitle);

  const toggleCommentsSidebar = () => {
    setShowCommentsSidebar(!showCommentsSidebar);
  };

  // Fetch document if ID is provided
  const { data: document, isLoading } = useQuery<Document>({
    queryKey: id ? [`/api/documents/${id}`] : ["/api/no-document"],
    enabled: !!id,
  });

  // Create new document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/documents", {
        title: "Untitled document",
        content: {},
      });
      return res.json();
    },
    onSuccess: (newDoc) => {
      setDocumentId(newDoc.id);
      setTitle(newDoc.title);
      setLocation(`/document/${newDoc.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create a new document",
        variant: "destructive",
      });
    },
  });

  // Create a new document if no ID is provided
  useEffect(() => {
    if (!id && !isLoading) {
      createDocumentMutation.mutate();
    }
  }, [id, isLoading]);

  // Set document data when loaded
  useEffect(() => {
    if (document) {
      setDocumentId(document.id);
      setTitle(document.title);
    }
  }, [document]);

  return (
    <div className="flex flex-col h-screen bg-doc-bg">
      <Header
        toggleCommentsSidebar={toggleCommentsSidebar}
        showCommentsSidebar={showCommentsSidebar}
      />

      {/* Comments sidebar is now handled directly in the EditorComponent */}

      <EditorComponent
        initialContent={document?.content}
        documentId={id ? parseInt(id) : undefined}
        isLoading={isLoading || createDocumentMutation.isPending}
        parentCommentSidebar={showCommentsSidebar}
        toggleParentCommentSidebar={toggleCommentsSidebar}
      />
    </div>
  );
}
