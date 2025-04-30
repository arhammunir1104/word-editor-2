/**
 * Image Settings Modal
 *
 * This component provides a Google Docs-like modal for editing image settings:
 * - Alt text for accessibility
 * - Caption text
 * - Image size/dimensions
 * - Alignment options
 */

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Trash2,
  Move,
  Image as ImageIcon,
  Type,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Separator } from "../../components/ui/separator";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../hooks/use-toast";

interface ImageModalProps {
  editor: any;
  imageId: string;
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  caption?: string;
  onClose: () => void;
}

export default function ImageModal({
  editor,
  imageId,
  src,
  alt = "",
  title = "",
  width,
  height,
  caption = "",
  onClose,
}: ImageModalProps) {
  // State for image attributes
  const [altText, setAltText] = useState(alt);
  const [imageTitle, setImageTitle] = useState(title);
  const [imageWidth, setImageWidth] = useState(width?.toString() || "");
  const [imageHeight, setImageHeight] = useState(height?.toString() || "");
  const [imageCaption, setImageCaption] = useState(caption);
  const [activeTab, setActiveTab] = useState("alt-text");

  const { toast } = useToast();
  const initialLoad = useRef(true);

  // Maintain aspect ratio when resizing
  const [aspectRatio, setAspectRatio] = useState(1);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  // Calculate initial aspect ratio on mount
  useEffect(() => {
    if (width && height && initialLoad.current) {
      setAspectRatio(width / height);
      initialLoad.current = false;
    }
  }, [width, height]);

  // Handle width change with aspect ratio lock
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = e.target.value;
    setImageWidth(newWidth);

    if (lockAspectRatio && newWidth && aspectRatio) {
      const calculatedHeight = Math.round(parseInt(newWidth) / aspectRatio);
      setImageHeight(calculatedHeight.toString());
    }
  };

  // Handle height change with aspect ratio lock
  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = e.target.value;
    setImageHeight(newHeight);

    if (lockAspectRatio && newHeight && aspectRatio) {
      const calculatedWidth = Math.round(parseInt(newHeight) * aspectRatio);
      setImageWidth(calculatedWidth.toString());
    }
  };

  // Apply all changes to the image
  const handleApply = () => {
    // Record this operation for undo/redo
    if (window.historyManager) {
      window.historyManager.addHistoryStep("update-image");
    }

    // Find the image node in the document
    editor.view.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === "image" && node.attrs.dataId === imageId) {
        // Apply all changes
        editor
          .chain()
          .setNodeSelection(pos)
          .updateAttributes("image", {
            alt: altText,
            title: imageTitle,
            width: imageWidth ? parseInt(imageWidth) : null,
            height: imageHeight ? parseInt(imageHeight) : null,
            caption: imageCaption,
          })
          .run();

        // Dispatch events for different attribute changes
        if (altText !== alt) {
          document.dispatchEvent(
            new CustomEvent("image:edit:alt", {
              detail: { id: imageId, alt: altText },
            }),
          );
        }

        if (imageCaption !== caption) {
          document.dispatchEvent(
            new CustomEvent("image:edit:caption", {
              detail: { id: imageId, caption: imageCaption },
            }),
          );
        }

        return false;
      }
      return true;
    });

    toast({
      title: "Image updated",
      description: "Your changes have been applied to the image.",
    });

    onClose();
  };

  // Handle image deletion
  const handleDelete = () => {
    // Record this operation for undo/redo
    if (window.historyManager) {
      window.historyManager.addHistoryStep("delete-image");
    }

    // Find and delete the image
    editor.view.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === "image" && node.attrs.dataId === imageId) {
        editor.chain().setNodeSelection(pos).deleteSelection().run();
        return false;
      }
      return true;
    });

    toast({
      title: "Image deleted",
      description: "The image has been removed from the document.",
    });

    onClose();
  };

  // Cancel changes
  const handleCancel = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-5 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <h3 className="text-lg font-medium text-gray-800">Image Options</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-[250px_1fr] gap-6">
          {/* Image preview */}
          <div className="border rounded p-2 flex flex-col items-center">
            <div className="overflow-hidden flex items-center justify-center h-48">
              <img
                src={src}
                style={{ border: "1px solid red" }}
                alt={altText}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Original dimensions: {width || "auto"} × {height || "auto"}
            </p>
          </div>

          {/* Tabs for different settings */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="alt-text">Alt Text</TabsTrigger>
              <TabsTrigger value="size">Size</TabsTrigger>
              <TabsTrigger value="caption">Caption</TabsTrigger>
            </TabsList>

            {/* Alt Text Tab */}
            <TabsContent value="alt-text" className="space-y-4">
              <div>
                <Label
                  htmlFor="alt"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Alt text (for screen readers)
                </Label>
                <Input
                  id="alt"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe this image"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Describe the image for people who can't see it
                </p>
              </div>

              <div>
                <Label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Title
                </Label>
                <Input
                  id="title"
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  placeholder="Image title"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional title shown on hover
                </p>
              </div>
            </TabsContent>

            {/* Size Tab */}
            <TabsContent value="size" className="space-y-4">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="lockAspectRatio"
                  checked={lockAspectRatio}
                  onChange={() => setLockAspectRatio(!lockAspectRatio)}
                  className="mr-2"
                />
                <Label htmlFor="lockAspectRatio" className="text-sm">
                  Lock aspect ratio
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="width"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Width (px)
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    value={imageWidth}
                    onChange={handleWidthChange}
                    placeholder="Auto"
                    min="10"
                    max="2000"
                    className="w-full"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="height"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Height (px)
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    value={imageHeight}
                    onChange={handleHeightChange}
                    placeholder="Auto"
                    min="10"
                    max="2000"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageWidth("100");
                    setImageHeight(Math.round(100 / aspectRatio).toString());
                  }}
                >
                  Small
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageWidth("250");
                    setImageHeight(Math.round(250 / aspectRatio).toString());
                  }}
                >
                  Medium
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageWidth("500");
                    setImageHeight(Math.round(500 / aspectRatio).toString());
                  }}
                >
                  Large
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageWidth("100%");
                    setImageHeight("auto");
                  }}
                >
                  Full width
                </Button>
              </div>
            </TabsContent>

            {/* Caption Tab */}
            <TabsContent value="caption" className="space-y-4">
              <div>
                <Label
                  htmlFor="caption"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Caption
                </Label>
                <Textarea
                  id="caption"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full h-32"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Caption will be displayed below the image
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <Separator className="my-5" />

        <div className="flex justify-between">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
