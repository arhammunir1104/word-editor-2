import React, { useState, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import {
  LINE_SPACING_PRESETS,
  toPt,
  fromPt,
  formatSpacing,
  setAllSpacing,
} from "./line-spacing-extension";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";

interface LineSpacingDialogProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
}

const LineSpacingDialog: React.FC<LineSpacingDialogProps> = ({
  editor,
  isOpen,
  onClose,
}) => {
  // Current values from the editor
  const [lineSpacing, setLineSpacing] = useState<string>("1.15"); // Default Google Docs
  const [spacingBefore, setSpacingBefore] = useState<string>("0pt");
  const [spacingAfter, setSpacingAfter] = useState<string>("0pt");

  // UI state for selected options
  const [selectedSpacing, setSelectedSpacing] = useState<string>("1.15");
  const [customLineSpacing, setCustomLineSpacing] = useState<string>("");
  const [hasSpacingBefore, setHasSpacingBefore] = useState<boolean>(false);
  const [hasSpacingAfter, setHasSpacingAfter] = useState<boolean>(false);
  const [customBeforeValue, setCustomBeforeValue] = useState<string>("0");
  const [customAfterValue, setCustomAfterValue] = useState<string>("0");

  // Open/Close state for combobox
  const [open, setOpen] = useState(false);

  // Get current values when the dialog opens
  useEffect(() => {
    if (!editor || !isOpen) return;

    try {
      // Get current paragraph or fallback to default
      const node = editor.state.selection.$head.parent;

      // Get current line spacing or fallback to default
      let currentLineSpacing = node.attrs.lineSpacing || "1.15";
      setLineSpacing(currentLineSpacing);

      // Find the closest preset or set to custom
      const matchingPreset = LINE_SPACING_PRESETS.find(
        (preset) => preset.value === currentLineSpacing,
      );

      if (matchingPreset) {
        setSelectedSpacing(matchingPreset.value);
      } else {
        setSelectedSpacing("custom");
        setCustomLineSpacing(currentLineSpacing);
      }

      // Get current spacing before/after or fallback to default
      const currentSpacingBefore = node.attrs.spacingBefore || "0pt";
      const currentSpacingAfter = node.attrs.spacingAfter || "0pt";

      setSpacingBefore(currentSpacingBefore);
      setSpacingAfter(currentSpacingAfter);

      // Check if we have spacing before/after
      const hasBefore = currentSpacingBefore !== "0pt";
      const hasAfter = currentSpacingAfter !== "0pt";

      setHasSpacingBefore(hasBefore);
      setHasSpacingAfter(hasAfter);

      // Set custom values (removing 'pt' suffix)
      if (hasBefore) {
        setCustomBeforeValue(fromPt(currentSpacingBefore).toString());
      }

      if (hasAfter) {
        setCustomAfterValue(fromPt(currentSpacingAfter).toString());
      }
    } catch (error) {
      console.error("Error getting current spacing values:", error);
    }
  }, [editor, isOpen]);

  // Handle applying spacing changes
  const handleApply = () => {
    if (!editor) return;

    try {
      // Get final line spacing value (preset or custom)
      let finalLineSpacing = selectedSpacing;
      console.log("Selected Spacing:", selectedSpacing);

      if (selectedSpacing === "custom") {
        finalLineSpacing = customLineSpacing || "1.15";
      }

      // Get final spacing before/after values
      const finalSpacingBefore = hasSpacingBefore
        ? toPt(parseFloat(customBeforeValue))
        : "0pt";
      const finalSpacingAfter = hasSpacingAfter
        ? toPt(parseFloat(customAfterValue))
        : "0pt";

      // Apply all spacing properties using our helper function
      setAllSpacing(
        editor,
        finalLineSpacing,
        finalSpacingBefore,
        finalSpacingAfter,
      );

      // Notify other components
      document.dispatchEvent(
        new CustomEvent("spacing:updated", {
          detail: {
            lineSpacing: finalLineSpacing,
            spacingBefore: finalSpacingBefore,
            spacingAfter: finalSpacingAfter,
          },
        }),
      );

      // Close dialog
      onClose();
    } catch (error) {
      console.error("Error applying spacing changes:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-md shadow-xl p-6 w-80">
        <h2 className="text-lg font-medium mb-4">Line & Paragraph Spacing</h2>

        {/* Line Spacing Dropdown */}
        <div className="mb-4">
          <Label htmlFor="line-spacing" className="block mb-2">
            Line spacing
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedSpacing === "custom"
                  ? `Custom (${customLineSpacing})`
                  : LINE_SPACING_PRESETS.find(
                      (preset) => preset.value === selectedSpacing,
                    )?.label || "Default"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search spacing..." />
                <CommandEmpty>No spacing option found.</CommandEmpty>
                <CommandGroup>
                  {LINE_SPACING_PRESETS.map((preset) => (
                    <CommandItem
                      key={preset.value}
                      onSelect={() => {
                        setSelectedSpacing(preset.value);
                        if (preset.value !== "custom") {
                          setCustomLineSpacing("");
                        }
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedSpacing === preset.value
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {preset.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Custom Line Spacing Input */}
        {selectedSpacing === "custom" && (
          <div className="mb-4">
            <Label htmlFor="custom-line-spacing" className="block mb-2">
              Custom spacing
            </Label>
            <Input
              id="custom-line-spacing"
              type="number"
              min="0.5"
              max="3.0"
              step="0.01"
              value={customLineSpacing}
              onChange={(e) => setCustomLineSpacing(e.target.value)}
              className="w-full"
            />
          </div>
        )}

        {/* Paragraph Spacing Options */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="spacing-before"
              checked={hasSpacingBefore}
              onCheckedChange={(checked) => {
                setHasSpacingBefore(checked === true);
              }}
            />
            <Label htmlFor="spacing-before" className="text-sm font-normal">
              Add space before paragraph
            </Label>
          </div>

          {hasSpacingBefore && (
            <div className="pl-6">
              <Input
                id="custom-before"
                type="number"
                min="0"
                max="72"
                value={customBeforeValue}
                onChange={(e) => setCustomBeforeValue(e.target.value)}
                className="w-20 inline-block mr-2"
              />
              <span className="text-sm text-gray-500">pt</span>
            </div>
          )}
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="spacing-after"
              checked={hasSpacingAfter}
              onCheckedChange={(checked) => {
                setHasSpacingAfter(checked === true);
              }}
            />
            <Label htmlFor="spacing-after" className="text-sm font-normal">
              Add space after paragraph
            </Label>
          </div>

          {hasSpacingAfter && (
            <div className="pl-6">
              <Input
                id="custom-after"
                type="number"
                min="0"
                max="72"
                value={customAfterValue}
                onChange={(e) => setCustomAfterValue(e.target.value)}
                className="w-20 inline-block mr-2"
              />
              <span className="text-sm text-gray-500">pt</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LineSpacingDialog;
