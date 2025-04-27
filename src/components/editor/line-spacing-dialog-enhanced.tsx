import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import {
  LINE_SPACING_PRESETS,
  toPt,
  fromPt,
  formatSpacing,
} from "./line-spacing-new";
import { Editor } from "@tiptap/react";

interface LineSpacingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
}

export function LineSpacingDialogEnhanced({
  isOpen,
  onClose,
  editor,
}: LineSpacingDialogProps) {
  // Get current values from editor (or use defaults)
  const getCurrentValues = () => {
    if (!editor) {
      return {
        lineSpacing: "1.15",
        spacingBefore: "0pt",
        spacingAfter: "0pt",
      };
    }

    // Get the current node attributes
    const { selection } = editor.state;
    const node = selection.$from.parent;

    // Extract values from node attributes
    return {
      lineSpacing: node.attrs.lineSpacing || "1.15",
      spacingBefore: node.attrs.spacingBefore || "0pt",
      spacingAfter: node.attrs.spacingAfter || "0pt",
    };
  };

  // Initialize state with current values
  const [values, setValues] = useState(getCurrentValues());
  const [customLineSpacing, setCustomLineSpacing] = useState(false);

  // Update state when dialog opens or editor changes
  useEffect(() => {
    if (isOpen && editor) {
      const current = getCurrentValues();
      setValues(current);

      // Check if current line spacing is a preset or custom
      const isPreset = LINE_SPACING_PRESETS.some(
        (preset) =>
          preset.value === current.lineSpacing && preset.value !== "custom",
      );
      setCustomLineSpacing(!isPreset);
    }
  }, [isOpen, editor]);

  // Apply changes to editor using proper extension commands
  const applyChanges = () => {
    if (!editor) return;

    // Use the extension commands for all spacing values
    editor
      .chain()
      .focus()
      .setLineSpacing(values.lineSpacing)
      .setSpacingBefore(values.spacingBefore)
      .setSpacingAfter(values.spacingAfter)
      .run();

    // Notify that spacing has been updated
    document.dispatchEvent(
      new CustomEvent("spacing:updated", {
        detail: {
          lineSpacing: values.lineSpacing,
          spacingBefore: values.spacingBefore,
          spacingAfter: values.spacingAfter,
        },
      }),
    );

    onClose();
  };

  // Modify spacing before/after values
  const handlePtChange = (
    field: "spacingBefore" | "spacingAfter",
    value: string,
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const newValue = toPt(numValue);
    setValues({ ...values, [field]: newValue });
  };

  // Handle line spacing change
  const handleLineSpacingChange = (value: string) => {
    if (value === "custom") {
      setCustomLineSpacing(true);
      return;
    }

    setCustomLineSpacing(false);
    setValues({ ...values, lineSpacing: value });
  };

  // Handle custom line spacing input
  const handleCustomLineSpacingChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setValues({ ...values, lineSpacing: numValue.toString() });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Line & paragraph spacing</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Line spacing options */}
          <div className="space-y-2">
            <Label htmlFor="spacing">Line spacing</Label>
            <RadioGroup
              value={customLineSpacing ? "custom" : values.lineSpacing}
              onValueChange={handleLineSpacingChange}
              className="flex flex-col space-y-1 my-2"
            >
              {LINE_SPACING_PRESETS.map((preset) => (
                <div key={preset.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={preset.value}
                    id={`spacing-${preset.value}`}
                  />
                  <Label
                    htmlFor={`spacing-${preset.value}`}
                    className="cursor-pointer"
                  >
                    {preset.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {/* Custom line spacing input */}
            {customLineSpacing && (
              <div className="mt-2 flex items-center space-x-2">
                <Input
                  id="custom-spacing"
                  type="number"
                  min="0.5"
                  max="3"
                  step="0.01"
                  className="w-20"
                  value={formatSpacing(values.lineSpacing)}
                  onChange={(e) =>
                    handleCustomLineSpacingChange(e.target.value)
                  }
                />
                <span>lines</span>
              </div>
            )}
          </div>

          {/* Paragraph spacing (Before) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="before">Before paragraph</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="before"
                  type="number"
                  min="0"
                  max="72"
                  step="1"
                  className="w-20"
                  value={fromPt(values.spacingBefore)}
                  onChange={(e) =>
                    handlePtChange("spacingBefore", e.target.value)
                  }
                />
                <span>pt</span>
              </div>
            </div>

            {/* Paragraph spacing (After) */}
            <div className="space-y-2">
              <Label htmlFor="after">After paragraph</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="after"
                  type="number"
                  min="0"
                  max="72"
                  step="1"
                  className="w-20"
                  value={fromPt(values.spacingAfter)}
                  onChange={(e) =>
                    handlePtChange("spacingAfter", e.target.value)
                  }
                />
                <span>pt</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={applyChanges}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LineSpacingDialogEnhanced;
