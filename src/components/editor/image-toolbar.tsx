/**
 * Image Toolbar
 *
 * This component renders controls for the currently selected image:
 * - Delete image
 * - Adjust size
 * - Edit alt text & caption
 * - Quick alignment controls
 */

import React, { useState, useEffect } from "react";
import {
  Settings,
  Trash2,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoveHorizontal,
  ChevronsLeftRight,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import ImageModal from "./image-modal";
import { useToast } from "../../hooks/use-toast";

interface ImageToolbarProps {
  editor: any;
  imageNode: any;
  position: { top: number; left: number };
  onClose: () => void;
}

export default function ImageToolbar({
  editor,
  imageNode,
  position,
  onClose,
}: ImageToolbarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  // Calculate position to ensure toolbar is visible
  const toolbarPosition = {
    top: `${Math.max(position.top - 40, 10)}px`,
    left: `${Math.max(position.left, 10)}px`,
  };

  console.log(toolbarPosition);

  // Handle clicks outside the toolbar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      // Only close if click is not on an image (which would set a new position)
      if (
        !(
          e.target instanceof HTMLElement &&
          (e.target.tagName === "IMG" ||
            e.target.closest(".image-toolbar, .image-modal"))
        )
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Delete the image
  const handleDelete = () => {
    // Record this operation for undo/redo
    if (window.historyManager) {
      window.historyManager.addHistoryStep("delete-image");
    }

    // Find and delete the image node
    editor.view.state.doc.descendants((node: any, pos: number) => {
      if (
        node.type.name === "image" &&
        node.attrs.dataId === imageNode.attrs.dataId
      ) {
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

  // Duplicate the image
  const handleDuplicate = () => {
    // Record this operation for undo/redo
    if (window.historyManager) {
      window.historyManager.addHistoryStep("duplicate-image");
    }

    // Insert a new image with the same attributes
    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: {
          ...imageNode.attrs,
          dataId: `image-${Date.now()}`, // Generate a new ID
        },
      })
      .run();

    toast({
      title: "Image duplicated",
      description: "A copy of the image has been inserted.",
    });
  };

  // Align image within the document
  const handleAlign = (alignment: "left" | "center" | "right") => {
    // Record this operation for undo/redo
    if (window.historyManager) {
      window.historyManager.addHistoryStep("align-image");
    }

    // Find the image node and update its alignment
    editor.view.state.doc.descendants((node: any, pos: number) => {
      if (
        node.type.name === "image" &&
        node.attrs.dataId === imageNode.attrs.dataId
      ) {
        editor
          .chain()
          .setNodeSelection(pos)
          .updateAttributes("image", {
            style: `float: ${alignment}; margin: ${alignment === "center" ? "0 auto" : alignment === "left" ? "0 1em 1em 0" : "0 0 1em 1em"};`,
          })
          .run();
        return false;
      }
      return true;
    });

    toast({
      description: `Image aligned ${alignment}`,
    });
  };

  // Open settings modal
  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  return (
    <>
      <div
        className="image-toolbar absolute bg-white rounded-md shadow-md p-1 z-20 flex gap-1"
        style={toolbarPosition}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Image settings"
          onClick={handleOpenSettings}
        >
          <Settings className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Duplicate image"
          onClick={handleDuplicate}
        >
          <Copy className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-gray-200 mx-1"></div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Align left"
          onClick={() => handleAlign("left")}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Align center"
          onClick={() => handleAlign("center")}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Align right"
          onClick={() => handleAlign("right")}
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-gray-200 mx-1"></div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          title="Delete image"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {/* Image settings modal */}
      console.log("Src : "imageNode.attrs.src) console.log("OTher attributes :
      "imageNode.attrs)
      {showSettings && (
        <ImageModal
          editor={editor}
          imageId={imageNode.attrs.dataId}
          src={imageNode.attrs.src}
          alt={imageNode.attrs.alt}
          title={imageNode.attrs.title}
          width={imageNode.attrs.width}
          height={imageNode.attrs.height}
          caption={imageNode.attrs.caption}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}
