import { useState, useRef, useEffect } from "react";
import { Input } from "../../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { cn } from "../../lib/utils";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presetColors?: string[];
  title?: string;
}

export default function ColorPicker({ 
  value = '#000000', 
  onChange, 
  presetColors = ['#000000', '#ff0000', '#0000ff', '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#8000ff', '#808080', '#ffffff'],
  title = 'Select Color'
}: ColorPickerProps) {
  const [color, setColor] = useState<string>(value);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update internal state when prop changes
  useEffect(() => {
    setColor(value);
  }, [value]);

  // Handle direct input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor);
  };

  // When the input loses focus or Enter is pressed, trigger the onChange
  const handleInputBlur = () => {
    onChange(color);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onChange(color);
      setIsOpen(false);
    }
  };

  // Handle preset color selection
  const handlePresetClick = (presetColor: string) => {
    setColor(presetColor);
    onChange(presetColor);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center cursor-pointer">
          <div 
            className="w-6 h-6 rounded-full border border-gray-300 mr-2 cursor-pointer"
            style={{ backgroundColor: color }}
            title={title}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="mb-3">
          <h4 className="mb-2 text-sm font-medium">Custom Color</h4>
          <div className="flex">
            <div 
              className="w-10 h-10 rounded-md border border-gray-300 mr-2"
              style={{ backgroundColor: color }}
            />
            <div className="flex-1">
              <Input
                ref={inputRef}
                type="text"
                value={color}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                className="mb-2"
                placeholder="#000000"
              />
              <Input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  onChange(e.target.value);
                }}
                className="h-8 p-0 w-full"
              />
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="mb-2 text-sm font-medium">Preset Colors</h4>
          <div className="grid grid-cols-5 gap-2">
            {presetColors.map((presetColor) => (
              <div
                key={presetColor}
                className={cn(
                  "w-8 h-8 rounded-md cursor-pointer border border-gray-300",
                  color === presetColor ? "ring-2 ring-primary ring-offset-1" : ""
                )}
                style={{ backgroundColor: presetColor }}
                onClick={() => handlePresetClick(presetColor)}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}