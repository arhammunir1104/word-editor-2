import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Slider } from "../../components/ui/slider";

// Standard page sizes (in inches)
export const PAGE_SIZES = {
  letter: { width: '8.5in', height: '11in', name: 'Letter (8.5" × 11")' },
  legal: { width: '8.5in', height: '14in', name: 'Legal (8.5" × 14")' },
  tabloid: { width: '11in', height: '17in', name: 'Tabloid (11" × 17")' },
  a4: { width: '8.27in', height: '11.69in', name: 'A4 (8.27" × 11.69")' },
  a3: { width: '11.69in', height: '16.54in', name: 'A3 (11.69" × 16.54")' },
};

// Standard margin presets
export const MARGIN_PRESETS = {
  normal: { top: '1in', bottom: '1in', left: '1in', right: '1in', name: 'Normal (1")' },
  narrow: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in', name: 'Narrow (0.5")' },
  wide: { top: '1.5in', bottom: '1.5in', left: '1.5in', right: '1.5in', name: 'Wide (1.5")' },
  custom: { top: '', bottom: '', left: '', right: '', name: 'Custom' },
};

export interface PageSetupProps {
  pageDimensions: {
    width: string;
    height: string;
    marginTop: string;
    marginBottom: string;
    marginLeft: string;
    marginRight: string;
    headerHeight: string;
    footerHeight: string;
    backgroundColor: string;
  };
  onPageSetupChange: (dimensions: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function PageSetupModal({ 
  pageDimensions, 
  onPageSetupChange, 
  isOpen, 
  onClose 
}: PageSetupProps) {
  const [dimensions, setDimensions] = useState({ ...pageDimensions });
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pageSize, setPageSize] = useState<keyof typeof PAGE_SIZES | 'custom'>('letter');
  const [marginPreset, setMarginPreset] = useState<keyof typeof MARGIN_PRESETS | 'custom'>('normal');
  
  // Handle page size selection
  const handlePageSizeChange = (size: string) => {
    const sizeKey = size as keyof typeof PAGE_SIZES;
    
    if (size === 'custom') {
      setPageSize('custom');
      return;
    }
    
    setPageSize(sizeKey);
    let width = PAGE_SIZES[sizeKey].width;
    let height = PAGE_SIZES[sizeKey].height;
    
    // If landscape, swap width and height
    if (pageOrientation === 'landscape') {
      [width, height] = [height, width];
    }
    
    setDimensions(prev => ({
      ...prev,
      width,
      height
    }));
  };
  
  // Handle margin preset selection
  const handleMarginPresetChange = (preset: string) => {
    const presetKey = preset as keyof typeof MARGIN_PRESETS;
    
    if (preset === 'custom') {
      setMarginPreset('custom');
      return;
    }
    
    setMarginPreset(presetKey);
    const { top, bottom, left, right } = MARGIN_PRESETS[presetKey];
    
    setDimensions(prev => ({
      ...prev,
      marginTop: top,
      marginBottom: bottom,
      marginLeft: left,
      marginRight: right
    }));
  };
  
  // Handle orientation change
  const handleOrientationChange = (orientation: string) => {
    const newOrientation = orientation as 'portrait' | 'landscape';
    
    if (newOrientation === pageOrientation) return;
    
    setPageOrientation(newOrientation);
    
    // Swap width and height if needed
    if (pageSize !== 'custom') {
      let { width, height } = PAGE_SIZES[pageSize as keyof typeof PAGE_SIZES];
      
      if (newOrientation === 'landscape') {
        [width, height] = [height, width];
      }
      
      setDimensions(prev => ({
        ...prev,
        width,
        height
      }));
    } else {
      // For custom sizes, swap width and height
      setDimensions(prev => ({
        ...prev,
        width: prev.height,
        height: prev.width
      }));
    }
  };
  
  // Handle input change for any dimension
  const handleInputChange = (field: string, value: string) => {
    setDimensions(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Mark as custom if changing size or margins
    if (['width', 'height'].includes(field)) {
      setPageSize('custom');
    } else if (['marginTop', 'marginBottom', 'marginLeft', 'marginRight'].includes(field)) {
      setMarginPreset('custom');
    }
  };
  
  // Handle background color change
  const handleColorChange = (color: string) => {
    setDimensions(prev => ({
      ...prev,
      backgroundColor: color
    }));
  };
  
  // Apply changes and close modal
  const handleApply = () => {
    onPageSetupChange(dimensions);
    onClose();
  };
  
  // Convert string dimensions to numeric values (for display or calculation)
  const parseValue = (value: string): number => {
    // Extract numeric value from dimension string (e.g., "1in" -> 1)
    const match = value.match(/^(\d*\.?\d+)/);
    return match ? parseFloat(match[1]) : 0;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Page Setup</DialogTitle>
          <DialogDescription>
            Customize document page dimensions, margins, and appearance.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="page">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="page">Page</TabsTrigger>
            <TabsTrigger value="margins">Margins</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>
          
          {/* Page Size Tab */}
          <TabsContent value="page" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="pageSize">Page Size</Label>
              <Select 
                value={pageSize} 
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select page size" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAGE_SIZES).map(([key, size]) => (
                    <SelectItem key={key} value={key}>{size.name}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Size</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="orientation">Orientation</Label>
              <Select 
                value={pageOrientation} 
                onValueChange={handleOrientationChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select orientation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width</Label>
                <Input 
                  id="width" 
                  value={dimensions.width} 
                  onChange={(e) => handleInputChange('width', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input 
                  id="height" 
                  value={dimensions.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
          
          {/* Margins Tab */}
          <TabsContent value="margins" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="marginPreset">Margin Preset</Label>
              <Select 
                value={marginPreset} 
                onValueChange={handleMarginPresetChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select margin preset" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MARGIN_PRESETS).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>{preset.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marginTop">Top Margin</Label>
                <Input 
                  id="marginTop" 
                  value={dimensions.marginTop}
                  onChange={(e) => handleInputChange('marginTop', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marginBottom">Bottom Margin</Label>
                <Input 
                  id="marginBottom" 
                  value={dimensions.marginBottom}
                  onChange={(e) => handleInputChange('marginBottom', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marginLeft">Left Margin</Label>
                <Input 
                  id="marginLeft" 
                  value={dimensions.marginLeft}
                  onChange={(e) => handleInputChange('marginLeft', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marginRight">Right Margin</Label>
                <Input 
                  id="marginRight" 
                  value={dimensions.marginRight}
                  onChange={(e) => handleInputChange('marginRight', e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="headerHeight">Header Height</Label>
                <Input 
                  id="headerHeight" 
                  value={dimensions.headerHeight}
                  onChange={(e) => handleInputChange('headerHeight', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerHeight">Footer Height</Label>
                <Input 
                  id="footerHeight" 
                  value={dimensions.footerHeight}
                  onChange={(e) => handleInputChange('footerHeight', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
          
          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Background Color</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded border border-gray-300" 
                  style={{ backgroundColor: dimensions.backgroundColor }}
                />
                <Input 
                  id="backgroundColor" 
                  value={dimensions.backgroundColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2 mt-4">
              <p className="text-sm text-gray-500">Common Colors</p>
              <div className="flex flex-wrap gap-2">
                {['#ffffff', '#f8f9fa', '#f5f5f5', '#fffbeb', '#f0fdf4', '#f0f9ff'].map(color => (
                  <button
                    key={color}
                    type="button"
                    className="w-8 h-8 rounded-md border border-gray-300 transition-all hover:scale-110"
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-2 mt-6">
              <Label>Page Preview</Label>
              <div className="flex justify-center mt-2">
                <div 
                  className="border border-gray-300 shadow-sm"
                  style={{
                    width: '150px',
                    height: parseValue(dimensions.height) / parseValue(dimensions.width) * 150,
                    backgroundColor: dimensions.backgroundColor,
                    position: 'relative'
                  }}
                >
                  {/* Margin visualization */}
                  <div 
                    className="border border-dashed border-blue-400 absolute"
                    style={{
                      top: `${parseValue(dimensions.marginTop) / parseValue(dimensions.height) * 100}%`,
                      left: `${parseValue(dimensions.marginLeft) / parseValue(dimensions.width) * 100}%`,
                      right: `${parseValue(dimensions.marginRight) / parseValue(dimensions.width) * 100}%`,
                      bottom: `${parseValue(dimensions.marginBottom) / parseValue(dimensions.height) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply}>Apply Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}